import { ArgumentsHost, ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../../../generated/prisma';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const reply = jest.fn();
  const adapterHost = {
    httpAdapter: {
      reply,
      getRequestUrl: () => '/api/v1/thing',
      getRequestMethod: () => 'GET',
    },
  } as unknown as HttpAdapterHost;
  const filter = new AllExceptionsFilter(adapterHost);

  const host = (headersSent = false) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({ headersSent }) }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => reply.mockReset());

  it('keeps the Nest body shape for HttpExceptions', () => {
    filter.catch(new NotFoundException('Backup not found'), host());

    const [, body, status] = reply.mock.calls[0];
    expect(status).toBe(404);
    expect(body).toMatchObject({ statusCode: 404, message: 'Backup not found', error: 'Not Found', path: '/api/v1/thing' });
  });

  it('keeps validation message arrays', () => {
    filter.catch(new ConflictException(['a', 'b']), host());
    expect(reply.mock.calls[0][1].message).toEqual(['a', 'b']);
  });

  it('maps Prisma unique violations to 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    filter.catch(err, host());
    expect(reply.mock.calls[0][2]).toBe(HttpStatus.CONFLICT);
  });

  it('hides internal error details on 500', () => {
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('connection string postgres://secret'), host());

    const [, body, status] = reply.mock.calls[0];
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('does nothing when the handler already replied', () => {
    filter.catch(new Error('late'), host(true));
    expect(reply).not.toHaveBeenCalled();
  });
});
