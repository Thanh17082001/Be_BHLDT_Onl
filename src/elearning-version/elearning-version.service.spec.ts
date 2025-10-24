import { Test, TestingModule } from '@nestjs/testing';
import { ElearningVersionService } from './elearning-version.service';

describe('ElearningVersionService', () => {
  let service: ElearningVersionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElearningVersionService],
    }).compile();

    service = module.get<ElearningVersionService>(ElearningVersionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
