import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Too many failures, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes in half-open to close circuit
  timeout: number;               // Time in ms before trying half-open from open
  monitoringPeriod: number;      // Time window in ms to track failures
}

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Circuit Breaker Service
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide graceful degradation when email service is unavailable
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  
  private circuits: Map<string, {
    state: CircuitState;
    metrics: CircuitMetrics;
    options: CircuitBreakerOptions;
    openedAt: number | null;
    halfOpenedAt: number | null;
  }> = new Map();

  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,        // Open after 5 failures
    successThreshold: 2,        // Close after 2 successes in half-open
    timeout: 60000,            // Try half-open after 1 minute
    monitoringPeriod: 120000   // Track failures over 2 minutes
  };

  /**
   * Create or get a circuit breaker for a specific service
   */
  getCircuit(serviceId: string, options?: Partial<CircuitBreakerOptions>) {
    if (!this.circuits.has(serviceId)) {
      this.circuits.set(serviceId, {
        state: CircuitState.CLOSED,
        metrics: {
          failures: 0,
          successes: 0,
          lastFailureTime: null,
          lastSuccessTime: null,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0
        },
        options: { ...this.defaultOptions, ...options },
        openedAt: null,
        halfOpenedAt: null
      });
      
      this.logger.log(`🔌 Circuit breaker created for service: ${serviceId}`);
    }
    
    return this.circuits.get(serviceId)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceId: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.getCircuit(serviceId);
    
    // Check if circuit should transition states
    this.checkCircuitState(serviceId);
    
    // If circuit is OPEN, reject immediately
    if (circuit.state === CircuitState.OPEN) {
      this.logger.warn(`⚡ Circuit OPEN for ${serviceId} - request rejected`);
      
      if (fallback) {
        this.logger.log(`Using fallback for ${serviceId}`);
        return await fallback();
      }
      
      throw new Error(`Circuit breaker is OPEN for ${serviceId}. Service temporarily unavailable.`);
    }
    
    try {
      // Execute the operation
      const result = await operation();
      
      // Record success
      this.recordSuccess(serviceId);
      
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(serviceId, error);
      
      // If circuit just opened and fallback is available, use it
      const updatedCircuit = this.circuits.get(serviceId)!;
      if (updatedCircuit.state === CircuitState.OPEN && fallback) {
        this.logger.log(`Circuit opened - using fallback for ${serviceId}`);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(serviceId: string) {
    const circuit = this.getCircuit(serviceId);
    const now = Date.now();
    
    circuit.metrics.successes++;
    circuit.metrics.lastSuccessTime = now;
    circuit.metrics.consecutiveSuccesses++;
    circuit.metrics.consecutiveFailures = 0;
    
    // If in HALF_OPEN state and reached success threshold, close the circuit
    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.metrics.consecutiveSuccesses >= circuit.options.successThreshold) {
        this.closeCircuit(serviceId);
      }
    }
    
    this.logger.debug(
      `✅ Success recorded for ${serviceId} - ` +
      `consecutive: ${circuit.metrics.consecutiveSuccesses}, ` +
      `state: ${circuit.state}`
    );
  }

  /**
   * Record a failed operation
   */
  recordFailure(serviceId: string, error: any) {
    const circuit = this.getCircuit(serviceId);
    const now = Date.now();
    
    circuit.metrics.failures++;
    circuit.metrics.lastFailureTime = now;
    circuit.metrics.consecutiveFailures++;
    circuit.metrics.consecutiveSuccesses = 0;
    
    this.logger.warn(
      `❌ Failure recorded for ${serviceId} - ` +
      `consecutive: ${circuit.metrics.consecutiveFailures}, ` +
      `state: ${circuit.state}, ` +
      `error: ${error.message}`
    );
    
    // If in HALF_OPEN state, go back to OPEN immediately on failure
    if (circuit.state === CircuitState.HALF_OPEN) {
      this.openCircuit(serviceId);
      return;
    }
    
    // If in CLOSED state, check if we should open the circuit
    if (circuit.state === CircuitState.CLOSED) {
      // Check if failures exceed threshold within monitoring period
      if (circuit.metrics.consecutiveFailures >= circuit.options.failureThreshold) {
        this.openCircuit(serviceId);
      }
    }
  }

  /**
   * Open the circuit (too many failures)
   */
  private openCircuit(serviceId: string) {
    const circuit = this.circuits.get(serviceId)!;
    circuit.state = CircuitState.OPEN;
    circuit.openedAt = Date.now();
    circuit.halfOpenedAt = null;
    
    this.logger.error(
      `🔴 Circuit OPENED for ${serviceId} - ` +
      `consecutive failures: ${circuit.metrics.consecutiveFailures}, ` +
      `will retry in ${circuit.options.timeout}ms`
    );
  }

  /**
   * Close the circuit (service recovered)
   */
  private closeCircuit(serviceId: string) {
    const circuit = this.circuits.get(serviceId)!;
    const previousState = circuit.state;
    
    circuit.state = CircuitState.CLOSED;
    circuit.openedAt = null;
    circuit.halfOpenedAt = null;
    circuit.metrics.consecutiveFailures = 0;
    circuit.metrics.consecutiveSuccesses = 0;
    
    this.logger.log(
      `🟢 Circuit CLOSED for ${serviceId} - ` +
      `service recovered (from ${previousState})`
    );
  }

  /**
   * Set circuit to half-open (testing recovery)
   */
  private halfOpenCircuit(serviceId: string) {
    const circuit = this.circuits.get(serviceId)!;
    circuit.state = CircuitState.HALF_OPEN;
    circuit.halfOpenedAt = Date.now();
    circuit.metrics.consecutiveSuccesses = 0;
    
    this.logger.log(
      `🟡 Circuit HALF-OPEN for ${serviceId} - ` +
      `testing if service recovered`
    );
  }

  /**
   * Check if circuit should transition to half-open from open
   */
  private checkCircuitState(serviceId: string) {
    const circuit = this.circuits.get(serviceId)!;
    
    if (circuit.state === CircuitState.OPEN && circuit.openedAt) {
      const now = Date.now();
      const timeSinceOpened = now - circuit.openedAt;
      
      // If timeout has elapsed, transition to half-open
      if (timeSinceOpened >= circuit.options.timeout) {
        this.halfOpenCircuit(serviceId);
      }
    }
  }

  /**
   * Get the current state of a circuit
   */
  getCircuitState(serviceId: string): CircuitState {
    const circuit = this.circuits.get(serviceId);
    return circuit ? circuit.state : CircuitState.CLOSED;
  }

  /**
   * Get metrics for a circuit
   */
  getCircuitMetrics(serviceId: string) {
    const circuit = this.circuits.get(serviceId);
    if (!circuit) {
      return null;
    }
    
    return {
      serviceId,
      state: circuit.state,
      metrics: { ...circuit.metrics },
      options: { ...circuit.options },
      openedAt: circuit.openedAt,
      halfOpenedAt: circuit.halfOpenedAt,
      uptime: this.calculateUptime(circuit)
    };
  }

  /**
   * Get metrics for all circuits
   */
  getAllCircuitMetrics() {
    const metrics: any[] = [];
    
    this.circuits.forEach((circuit, serviceId) => {
      metrics.push(this.getCircuitMetrics(serviceId));
    });
    
    return metrics;
  }

  /**
   * Calculate uptime percentage for a circuit
   */
  private calculateUptime(circuit: any): number {
    const total = circuit.metrics.successes + circuit.metrics.failures;
    if (total === 0) return 100;
    
    return (circuit.metrics.successes / total) * 100;
  }

  /**
   * Reset a circuit (for testing or manual intervention)
   */
  resetCircuit(serviceId: string) {
    const circuit = this.circuits.get(serviceId);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.metrics = {
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0
      };
      circuit.openedAt = null;
      circuit.halfOpenedAt = null;
      
      this.logger.log(`🔄 Circuit reset for ${serviceId}`);
    }
  }

  /**
   * Force open a circuit (for maintenance or testing)
   */
  forceOpenCircuit(serviceId: string) {
    const circuit = this.getCircuit(serviceId);
    this.openCircuit(serviceId);
    this.logger.warn(`🔒 Circuit manually opened for ${serviceId}`);
  }

  /**
   * Force close a circuit (for maintenance or testing)
   */
  forceCloseCircuit(serviceId: string) {
    const circuit = this.getCircuit(serviceId);
    this.closeCircuit(serviceId);
    this.logger.log(`🔓 Circuit manually closed for ${serviceId}`);
  }
}
