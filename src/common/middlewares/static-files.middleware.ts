import { Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DoaminsService } from 'src/doamins/doamins.service';
import { Doamin } from 'src/doamins/entities/doamin.entity';

@Injectable()

export class StaticFilesMiddleware {
    private static allowedDomains: Doamin[] = [];

    constructor(private readonly allowedDomainService: DoaminsService) {
        this.loadAllowedDomains();
    }

    async loadAllowedDomains() {
        StaticFilesMiddleware.allowedDomains = await this.allowedDomainService.findAll();
    }

    use(req: Request, res: Response, next: NextFunction) {
        const origin = req.headers.origin ??  req.headers.referer; // Lấy Origin hoặc Referer


        // Chỉ cho phép truy cập từ FE của bạn

        // Nếu request có Origin hoặc Referer hợp lệ (FE của bạn)
        if (origin && StaticFilesMiddleware.allowedDomains.some((allowed) => origin.startsWith(allowed.name))) {
            console.log('dc wwwww');
            return next();
        }
        console.log('k đc', origin);

        return res.status(403).json({ message: 'Access Forbidden' });
    }
}
