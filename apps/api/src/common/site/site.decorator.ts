import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { SiteContext, SiteId } from './site.types';

export const CurrentSite = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SiteContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.site ?? { id: SiteId.UNKNOWN, origin: null };
  },
);
