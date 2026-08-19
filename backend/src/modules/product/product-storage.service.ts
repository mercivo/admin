import { Injectable } from '@nestjs/common';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';

@Injectable()
export class ProductStorageService {
  constructor(private readonly storage: CloudStorageService) {}

  async uploadProductImage(file: Express.Multer.File, tenantId: string, siteId: string): Promise<{ url: string; objectName: string }> {
    return this.storage.upload(file, `tenants/${tenantId}/sites/${siteId}/images`);
  }
}
