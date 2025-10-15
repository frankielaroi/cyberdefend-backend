import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes in HALF_OPEN to close circuit
  timeout: number;               // Time in ms before trying HALF_OPEN state
  monitoringPeriod?: number;     // Time window for counting failures (ms)
}

/**
 * Circuit Breaker Statistics
 */
interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  openedAt?: number;
  halfOpenedAt?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Circuit Breaker Service
 * 
 * Implements the Circuit Breaker pattern to prevent cascading failures.
 * Protects external services (like SMTP) from overload when they're failing.
 * 
 * States:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Service is failing, reject requests immediately (fail fast)
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 * 
 * @example
 * ```typescript
 * // Wrap service call with circuit breaker
 * const result = await circuitBreaker.execute('email-service', 
 *   async () => await sendEmail(data),
 *   { failureThreshold: 5, timeout: 60000 }
 * );
 * ```
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitStats> = new Map();
  private recentFailures: Map<string, number[]> = new Map(); // Track failure timestamps

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param circuitKey - Unique identifier for this circuit
   * @param fn - Async function to execute
   * @param config - Circuit breaker configuration
   * @returns Result from the function
   * @throws Error if circuit is OPEN or function fails
   */
  async execute<T>(
    circuitKey: string,
    fn: () => Promise<T>,
    config: CircuitBreakerConfig
  ): Promise<T> {
    const circuit = this.getCircuit(circuitKey);
    const now = Date.now();

    // Check circuit state
    this.updateCircuitState(circuitKey, config, now);

    if (circuit.state === CircuitState.OPEN) {
      const waitTime = Math.ceil((circuit.openedAt! + config.timeout - now) / 1000);
      const error = new Error(
        `Circuit breaker is OPEN for "${circuitKey}". ` +
        `Service is currently unavailable. Retry in ${waitTime}s.`
      );
      this.logger.warn(
        `🔴 Circuit OPEN: ${circuitKey} - Failing fast (wait ${waitTime}s)`
      );
      throw error;
    }

    // Execute function
    circuit.totalRequests++;
    
    try {
      const result = await fn();
      
      // Success
      this.recordSuccess(circuitKey, config, now);
      
      return result;
    } catch (error) {
      // Failure
      this.recordFailure(circuitKey, config, now, error);
      
      throw error;
    }
  }

  /**
   * Get current state of a circuit
   */
  getCircuitState(circuitKey: string): CircuitState {
    const circuit = this.circuits.get(circuitKey);
    return circuit?.state || CircuitState.CLOSED;
  }

  /**
   * Get statistics for a circuit
   */
  getCircuitStats(circuitKey: string): CircuitStats | null {
    return this.circuits.get(circuitKey) || null;
  }

  /**
   * Get statistics for all circuits
   */
  getAllCircuitStats(): Map<string, CircuitStats> {
    return new Map(this.circuits);
  }

  /**
   * Manually reset a circuit to CLOSED state
   */
  resetCircuit(circuitKey: string): void {
    const circuit = this.getCircuit(circuitKey);
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.openedAt = undefined;
    circuit.halfOpenedAt = undefined;
    
    this.recentFailures.delete(circuitKey);
    
    this.logger.log(`✅ Circuit manually reset: ${circuitKey}`);
  }

  /**
   * Reset all circuits
   */
  resetAllCircuits(): void {
    for (const key of this.circuits.keys()) {
      this.resetCircuit(key);
    }
    this.logger.log('✅ All circuits reset');
  }

  /**
   * Check if circuit is healthy (CLOSED state with low failure rate)
   */
  isHealthy(circuitKey: string): boolean {
    const circuit = this.circuits.get(circuitKey);
    
    if (!circuit) {
      return true; // No circuit = no failures yet = healthy
    }

    if (circuit.state !== CircuitState.CLOSED) {
      return false;
    }

    // Check failure rate
    const totalAttempts = circuit.totalRequests;
    if (totalAttempts === 0) {
      return true;
    }

    const failureRate = (circuit.totalFailures / totalAttempts) * 100;
    return failureRate < 20; // Healthy if < 20% failure rate
  }

  /**
   * Get or create circuit
   */
  private getCircuit(circuitKey: string): CircuitStats {
    if (!this.circuits.has(circuitKey)) {
      this.circuits.set(circuitKey, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0
      });
    }
    return this.circuits.get(circuitKey)!;
  }

  /**
   * Update circuit state based on time and thresholds
   */
  private updateCircuitState(
    circuitKey: string,
    config: CircuitBreakerConfig,
    now: number
  ): void {
    const circuit = this.getCircuit(circuitKey);

    // OPEN -> HALF_OPEN: After timeout, try recovery
    if (circuit.state === CircuitState.OPEN && circuit.openedAt) {
      const timeSinceOpen = now - circuit.openedAt;
      
      if (timeSinceOpen >= config.timeout) {
        circuit.state = CircuitState.HALF_OPEN;
        circuit.halfOpenedAt = now;
        circuit.successes = 0;
        circuit.failures = 0;
        
        this.logger.log(
          `🟡 Circuit HALF_OPEN: ${circuitKey} - Testing recovery after ${(timeSinceOpen / 1000).toFixed(1)}s`
        );
      }
    }

    // Clean up old failures if monitoring period is set
    if (config.monitoringPeriod) {
      this.cleanupOldFailures(circuitKey, config.monitoringPeriod, now);
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(
    circuitKey: string,
    config: CircuitBreakerConfig,
    now: number
  ): void {
    const circuit = this.getCircuit(circuitKey);
    
    circuit.successes++;
    circuit.totalSuccesses++;
    circuit.lastSuccessTime = now;

    if (circuit.state === CircuitState.HALF_OPEN) {
      // In HALF_OPEN, count successes to close circuit
      if (circuit.successes >= config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.openedAt = undefined;
        circuit.halfOpenedAt = undefined;
        
        this.recentFailures.delete(circuitKey);
        
        this.logger.log(
          `🟢 Circuit CLOSED: ${circuitKey} - Service recovered ` +
          `(${circuit.successes} consecutive successes)`
        );
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // In CLOSED state, reset failure counter on success
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(
    circuitKey: string,
    config: CircuitBreakerConfig,
    now: number,
    error: Error
  ): void {
    const circuit = this.getCircuit(circuitKey);
    
    circuit.failures++;
    circuit.totalFailures++;
    circuit.lastFailureTime = now;

    // Track recent failures
    if (!this.recentFailures.has(circuitKey)) {
      this.recentFailures.set(circuitKey, []);
    }
    this.recentFailures.get(circuitKey)!.push(now);

    if (circuit.state === CircuitState.HALF_OPEN) {
      // In HALF_OPEN, any failure reopens the circuit
      circuit.state = CircuitState.OPEN;
      circuit.openedAt = now;
      circuit.halfOpenedAt = undefined;
      
      this.logger.warn(
        `🔴 Circuit RE-OPENED: ${circuitKey} - Recovery failed. ` +
        `Error: ${error.message}`
      );
    } else if (circuit.state === CircuitState.CLOSED) {
      // In CLOSED, open if threshold exceeded
      if (circuit.failures >= config.failureThreshold) {
        circuit.state = CircuitState.OPEN;
        circuit.openedAt = now;
        
        this.logger.error(
          `🔴 Circuit OPENED: ${circuitKey} - Failure threshold exceeded ` +
          `(${circuit.failures}/${config.failureThreshold}). ` +
          `Last error: ${error.message}`
        );
      } else {
        this.logger.warn(
          `⚠️ Circuit failure: ${circuitKey} - ` +
          `${circuit.failures}/${config.failureThreshold} failures. ` +
          `Error: ${error.message}`
        );
      }
    }
  }

  /**
   * Clean up old failures outside monitoring period
   */
  private cleanupOldFailures(
    circuitKey: string,
    monitoringPeriod: number,
    now: number
  ): void {
    const failures = this.recentFailures.get(circuitKey);
    if (!failures) return;

    const cutoff = now - monitoringPeriod;
    const recentFailures = failures.filter(timestamp => timestamp > cutoff);
    
    this.recentFailures.set(circuitKey, recentFailures);

    // Update failure count based on recent failures
    const circuit = this.getCircuit(circuitKey);
    if (circuit.state === CircuitState.CLOSED) {
      circuit.failures = recentFailures.length;
    }
  }

  /**
   * Get failure rate percentage for a circuit
   */
  getFailureRate(circuitKey: string): number {
    const circuit = this.circuits.get(circuitKey);
    if (!circuit || circuit.totalRequests === 0) {
      return 0;
    }
    return (circuit.totalFailures / circuit.totalRequests) * 100;
  }

  /**
   * Get health summary for all circuits
   */
  getHealthSummary(): {
    healthy: string[];
    degraded: string[];
    failing: string[];
    total: number;
  } {
    const healthy: string[] = [];
    const degraded: string[] = [];
    const failing: string[] = [];

    for (const [key, circuit] of this.circuits.entries()) {
      if (circuit.state === CircuitState.OPEN) {
        failing.push(key);
      } else if (circuit.state === CircuitState.HALF_OPEN) {
        degraded.push(key);
      } else if (this.isHealthy(key)) {
        healthy.push(key);
      } else {
        degraded.push(key);
      }
    }

    return {
      healthy,
      degraded,
      failing,
      total: this.circuits.size
    };
  }
}
