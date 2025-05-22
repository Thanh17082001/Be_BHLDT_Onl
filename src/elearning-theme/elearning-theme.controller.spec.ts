import { Test, TestingModule } from '@nestjs/testing';
import { ElearningThemeController } from './elearning-theme.controller';
import { ElearningThemeService } from './elearning-theme.service';

describe('ElearningThemeController', () => {
  let controller: ElearningThemeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElearningThemeController],
      providers: [ElearningThemeService],
    }).compile();

    controller = module.get<ElearningThemeController>(ElearningThemeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
