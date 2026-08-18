export interface Product {
  id: string | number;
  nameZh: string;
  nameEn: string;
  sku: string;
  price: string;
  basePrice?: number;
  levelPrices?: Record<string, number>;
  variants?: Array<{ specification: string; option: string; stock: number; surcharge: number }>;
  tags?: string[];
  stock: number;
  moq: number;
  status: 'published' | 'draft';
  category: string;
  img: string;
  hot: boolean;
  badge?: '' | 'new' | 'hot' | 'bestseller' | 'recommended';
  likeCount?: number;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id: string | number;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  product: string;
  summary: string;
  time: string;
  status: 'new' | 'contacted' | 'converted';
  score: number;
  tag: string;
  assignedTo?: string;
}

export interface ChatMsg {
  id: string | number;
  type: 'system' | 'user' | 'ai' | 'product' | 'confirm' | 'form';
  text?: string;
  product?: { name: string; price: string; img: string };
  productData?: { name: string; price: string; img: string };
}

export interface Agent {
  id: string;
  agentId?: string;
  name: string;
  desc: string;
  status: 'active' | 'paused' | 'draft';
  model: string;
  lang: string;
  agentType?: 'sales' | 'translation' | 'sourcing';
  systemPrompt?: string;
  chats: number;
  leads: number;
  rate: string;
  satisfaction: number;
  icon: string;
  color: string;
}

export interface DictChild {
  code: string;
  label: string;
  sort: number;
  status: string;
  remark: string;
}

export interface DictEntry extends DictChild {
  children: DictChild[];
}

export interface DictType {
  id: string;
  label: string;
  icon: string;
  children: DictEntry[];
}
