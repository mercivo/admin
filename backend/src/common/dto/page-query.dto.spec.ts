import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PageQueryDto, pageOffset, pageResult } from './page-query.dto';

describe('PageQueryDto', () => {
  it('uses page 1 and 10 rows by default', async () => {
    const query = plainToInstance(PageQueryDto, {});
    expect(await validate(query)).toHaveLength(0);
    expect(pageResult([], 0, query)).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it.each([10, 20, 50])('accepts page size %i', async pageSize => {
    const query = plainToInstance(PageQueryDto, { page: '2', pageSize: String(pageSize) });
    expect(await validate(query)).toHaveLength(0);
    expect(pageOffset(query)).toBe(pageSize);
  });

  it.each([0, 1, 9, 100])('rejects unsupported page size %i', async pageSize => {
    const query = plainToInstance(PageQueryDto, { pageSize: String(pageSize) });
    expect(await validate(query)).not.toHaveLength(0);
  });

  it('rejects invalid page numbers', async () => {
    expect(await validate(plainToInstance(PageQueryDto, { page: '0' }))).not.toHaveLength(0);
  });
});
