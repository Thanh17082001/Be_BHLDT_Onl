import { Test, TestingModule } from '@nestjs/testing';
import { ElearningVideoService } from './elearning-video.service';

describe('ElearningVideoService', () => {
  let service: ElearningVideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElearningVideoService],
    }).compile();

    service = module.get<ElearningVideoService>(ElearningVideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
