import { RemoveLegacyProductMetadata1792675000000 } from '../../migrations/1792675000000-RemoveLegacyProductMetadata';

describe('RemoveLegacyProductMetadata migration', () => {
  it('drops only the legacy product metadata columns and keeps likes and images', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new RemoveLegacyProductMetadata1792675000000().up({ query } as never);
    const sql = String(query.mock.calls[0][0]);
    for (const column of ['brand', 'gtin', 'enable_reviews', 'review_rating', 'seo_title', 'seo_description', 'seo_image']) {
      expect(sql).toContain(`DROP COLUMN \`${column}\``);
    }
    expect(sql).not.toContain('like_count');
    expect(sql).not.toContain('`img`');
    expect(sql).not.toContain('`images`');
  });
});
