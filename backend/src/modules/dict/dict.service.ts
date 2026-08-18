import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DictType } from './dict-type.entity';
import { DictEntry } from './dict-entry.entity';
import { CreateDictEntryDto, UpdateDictEntryDto } from './dict.dto';

@Injectable()
export class DictService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DictType)
    private readonly dictTypeRepository: Repository<DictType>,
    @InjectRepository(DictEntry)
    private readonly dictEntryRepository: Repository<DictEntry>,
  ) {}

  // ---- Dict Types ----
  async findAllTypes(siteId: string): Promise<DictType[]> {
    return this.dictTypeRepository.find({ where: { siteId } });
  }

  // ---- Dict Entries ----
  async findEntriesByType(typeId: string, siteId: string): Promise<DictEntry[]> {
    return this.dictEntryRepository.find({
      where: { typeId, siteId },
      order: { sort: 'ASC' },
    });
  }

  async createEntry(typeId: string, dto: CreateDictEntryDto, tenantId: string, siteId: string): Promise<DictEntry> {
    const dictType = await this.dictTypeRepository.findOne({ where: { typeId, siteId } });
    if (!dictType) throw new NotFoundException(`Dict type ${typeId} not found`);
    const entry = this.dictEntryRepository.create({ ...dto, typeId, tenantId, siteId });
    return this.dictEntryRepository.save(entry);
  }

  async updateEntry(typeId: string, code: string, dto: UpdateDictEntryDto, siteId: string): Promise<DictEntry> {
    return this.dataSource.transaction(async manager => {
      const entry = await manager.findOne(DictEntry, { where: { typeId, code, siteId } });
      if (!entry) throw new NotFoundException(`Dict entry ${code} not found in ${typeId}`);
      const nextCode = dto.code?.trim() || code;
      if (nextCode !== code && await manager.exists(DictEntry, { where: { typeId, code: nextCode, siteId } })) {
        throw new ConflictException('字典项编码已存在');
      }
      const { code: _newCode, ...values } = dto;
      Object.assign(entry, values, { code: nextCode });
      const saved = await manager.save(DictEntry, entry);
      if (nextCode !== code) {
        await manager.update(DictEntry, { typeId, siteId, parentCode: code }, { parentCode: nextCode });
        if (typeId === 'category') {
          await manager.createQueryBuilder().update('products').set({ category: nextCode }).where('site_id = :siteId AND category = :code', { siteId, code }).execute();
        }
      }
      return saved;
    });
  }

  async deleteEntry(typeId: string, code: string, siteId: string): Promise<void> {
    const entry = await this.dictEntryRepository.findOne({ where: { typeId, code, siteId } });
    if (!entry) throw new NotFoundException(`Dict entry ${code} not found in ${typeId}`);
    await this.dictEntryRepository.remove(entry);
  }

  /** 获取完整的字典树结构（用于前端 DictMgmt 页面） */
  async getFullTree(siteId: string): Promise<unknown[]> {
    const types = await this.dictTypeRepository.find({ where: { siteId } });
    const result: unknown[] = [];

    for (const type of types) {
      const entries = await this.dictEntryRepository.find({
        where: { typeId: type.typeId, siteId },
        order: { sort: 'ASC' },
      });

      const buildTree = (parentCode: string | null): unknown[] => {
        return entries
          .filter((e) => e.parentCode === parentCode || (!parentCode && !e.parentCode))
          .map((e) => ({
            code: e.code,
            label: e.label,
            sort: e.sort,
            status: e.status,
            remark: e.remark,
            children: buildTree(e.code),
          }));
      };

      result.push({
        id: type.typeId,
        label: type.label,
        icon: type.icon,
        children: buildTree(null),
      });
    }

    return result;
  }
}
