import { Test, TestingModule } from '@nestjs/testing';
import { ElearningVideoController } from './elearning-video.controller';
import { ElearningVideoService } from './elearning-video.service';

describe('ElearningVideoController', () => {
  let controller: ElearningVideoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElearningVideoController],
      providers: [ElearningVideoService],
    }).compile();

    controller = module.get<ElearningVideoController>(ElearningVideoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
