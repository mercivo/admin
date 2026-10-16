import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InventoryListQueryDto } from './inventory-query.dto';

describe('InventoryListQueryDto', () => {
  it('treats empty date filters as omitted', async () => {
    const query = plainToInstance(InventoryListQueryDto, {
      startDate: '',
      endDate: '',
    });

    await expect(validate(query)).resolves.toEqual([]);
    expect(query.startDate).toBeUndefined();
    expect(query.endDate).toBeUndefined();
  });

  it('still rejects a non-empty invalid date', async () => {
    const query = plainToInstance(InventoryListQueryDto, {
      startDate: 'not-a-date',
    });

    const errors = await validate(query);
    expect(errors).toEqual([
      expect.objectContaining({ property: 'startDate' }),
    ]);
  });
});
