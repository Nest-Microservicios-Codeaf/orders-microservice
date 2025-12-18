
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements RpcExceptionFilter {
    catch(exception: RpcException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const rpcRrror = exception.getError();

        if (typeof rpcRrror === 'object' && 'status' in rpcRrror && 'message' in rpcRrror) {
            const status = isNaN(+(rpcRrror as any).status) ? 400 : +(rpcRrror as any).status;
            return response.status(status).json(rpcRrror);
        }

        response.status(400).json({
            statusCode: 400,
            message: rpcRrror,
        });
    }
}
