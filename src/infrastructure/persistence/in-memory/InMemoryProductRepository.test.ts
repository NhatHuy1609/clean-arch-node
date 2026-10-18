import { describeProductRepositoryContract } from '../ProductRepository.contract';
import { InMemoryProductRepository } from './InMemoryProductRepository';

describeProductRepositoryContract('in-memory', async () => new InMemoryProductRepository());
