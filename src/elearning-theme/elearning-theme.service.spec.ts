import { Test, TestingModule } from '@nestjs/testing';
import { ElearningThemeService } from './elearning-theme.service';

describe('ElearningThemeService', () => {
  let service: ElearningThemeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElearningThemeService],
    }).compile();

    service = module.get<ElearningThemeService>(ElearningThemeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
