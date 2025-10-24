import { Test, TestingModule } from '@nestjs/testing';
import { ElearningVersionController } from './elearning-version.controller';
import { ElearningVersionService } from './elearning-version.service';

describe('ElearningVersionController', () => {
  let controller: ElearningVersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElearningVersionController],
      providers: [ElearningVersionService],
    }).compile();

    controller = module.get<ElearningVersionController>(ElearningVersionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
