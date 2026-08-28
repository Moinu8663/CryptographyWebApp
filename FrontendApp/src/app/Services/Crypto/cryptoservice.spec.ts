import { TestBed } from '@angular/core/testing';

import { Cryptoservice } from './cryptoservice';

describe('Cryptoservice', () => {
  let service: Cryptoservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Cryptoservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
