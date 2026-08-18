import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Select } from 'antd';
import { ShoppingCart, Star, CheckCircle, Truck, Shield, ArrowLeft, Globe, MessageCircle, X, Send } from 'lucide-react';
import Toast, { ToastType } from '../../components/shared/Toast';
import { leadApi, productApi } from '../../services/api/index';
import type { Product } from '../../types';

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [mainImage, setMainImage] = useState(0);
  const [quantity, setQuantity] = useState(500);
  const [lang, setLang] = useState('EN');
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<'inquiry' | 'sample'>('inquiry');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', company: '', requirements: '', bagType: '' });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => { if (id) productApi.getById(id).then(setProduct).catch(() => showToast('商品加载失败', 'error')); }, [id]);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const openInquiry = (type: 'inquiry' | 'sample') => {
    setInquiryType(type);
    setInquiryOpen(true);
  };

  const handleSendInquiry = async () => {
    try { await leadApi.create({ name: inquiryForm.name, email: inquiryForm.email, company: inquiryForm.company, phone: '', country: '', product: product?.nameEn || inquiryForm.bagType || 'Product inquiry', summary: inquiryForm.requirements, status: 'new', score: inquiryType === 'sample' ? 75 : 65, tag: inquiryType === 'sample' ? '样品申请' : '商品询盘' }); }
    catch { showToast('提交失败，请稍后重试', 'error'); return; }
    setInquiryOpen(false);
    showToast(inquiryType === 'inquiry' ? '询价已发送，我们将在24小时内回复' : '样品申请已提交，我们将尽快与您联系', 'success');
    setInquiryForm({ name: '', email: '', company: '', requirements: '', bagType: '' });
  };

  const images = [
    product?.img || 'photo-1542601906990-b4d3fb778b09',
    'photo-1553062407-98eeb64c6a62',
    'photo-1584917865442-de89df76afd3',
    'photo-1491637639811-60e2756cc1c7',
  ];

  const specs = [
    { label: '材质', value: '100% 可降解无纺布 / 棉质 / 帆布' },
    { label: '尺寸', value: '40×30×15cm (可定制)' },
    { label: '最小起订量', value: `${product?.moq || 0} 件` },
    { label: '印刷', value: '丝网印刷 / 热转印 / 刺绣' },
    { label: '认证', value: 'ISO 9001, REACH, OEKO-TEX' },
    { label: '样品', value: '3-5 天打样' },
    { label: '交期', value: '15-25 天批量生产' },
  ];

  return (
    <div className="min-h-full bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm"><Globe className="w-4 h-4 text-white" /></div>
            EcoBags
          </div>
          <div className="flex items-center gap-6 ml-4">
            {['Home', 'Products', 'About Us', 'Contact'].map(l => (
              <a key={l} href="#" className={`text-sm font-medium transition-colors ${l === 'Products' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}>{l}</a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden text-xs shadow-sm">
              {['EN', '中文', 'ES'].map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-semibold transition-colors ${lang === l ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}>{l}</button>
              ))}
            </div>
            <button className="relative p-2 hover:bg-gray-100 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-2">
        <button onClick={() => navigate('/products')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
      </div>

      {/* Product Detail */}
      <div className="max-w-6xl mx-auto px-6 py-2 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Images */}
        <div>
          <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3">
            <img src={images[mainImage].startsWith('http') ? images[mainImage] : `https://images.unsplash.com/${images[mainImage]}?w=600&h=600&fit=crop&auto=format`} alt="Product" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <button key={i} onClick={() => setMainImage(i)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-colors ${i === mainImage ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}>
                <img src={`https://images.unsplash.com/${img}?w=120&h=120&fit=crop&auto=format`} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">Best Seller</span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Eco-Friendly</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{product?.nameEn || 'Loading...'}</h1>
          <div className="text-gray-500 mt-3 leading-relaxed">
            {product?.description ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} /> : 'Premium eco-friendly product, fully customizable with your brand logo and design.'}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4" fill="#F59E0B" stroke="#F59E0B" />
              ))}
            </div>
            <span className="text-sm text-gray-500 font-medium">{product?.hot ? '热销商品' : '在售商品'}</span>
          </div>

          {/* Price */}
          <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{product?.price || '—'}</span>
              <span className="text-sm text-gray-400">/ pcs</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Price varies by quantity, material, and printing options</p>
          </div>

          {/* Quantity */}
          <div className="mt-5">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Order Quantity</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(q => Math.max(product?.moq || 1, q - 100))} className="px-3 py-2.5 hover:bg-gray-50 text-gray-500 font-bold">-</button>
                <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-24 text-center py-2.5 border-x border-gray-200 text-sm font-bold outline-none" />
                <button onClick={() => setQuantity(q => q + 100)} className="px-3 py-2.5 hover:bg-gray-50 text-gray-500 font-bold">+</button>
              </div>
              <span className="text-xs text-gray-400">最小起订量：{product?.moq || 0} 件</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button onClick={() => openInquiry('inquiry')} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20">
              Add to Inquiry
            </button>
            <button onClick={() => openInquiry('sample')} className="px-4 py-3 border-2 border-primary text-primary rounded-xl font-bold text-sm hover:bg-primary/5">
              Get Sample
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex gap-4 mt-6 pt-5 border-t border-gray-100">
            {[
              { icon: Truck, text: '全球发货' },
              { icon: Shield, text: '品质保证' },
              { icon: CheckCircle, text: '免费打样' },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-emerald-500" />{b.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Specs + Details */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Specifications</h2>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100">
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700 w-28">{spec.label}</span>
                  <span className="text-sm text-gray-600">{spec.value}</span>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Product Description</h2>
            <div className="text-gray-600 space-y-3 text-sm leading-relaxed">
              <p>Our eco-friendly shopping bags are crafted from premium sustainable materials, designed to meet the needs of modern businesses while reducing environmental impact.</p>
              <p>Each bag undergoes rigorous quality control checks to ensure durability, color consistency, and print accuracy. With over 14 years of manufacturing experience, we deliver products that exceed expectations.</p>
              <p><strong className="text-gray-900">Key features:</strong></p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>100% biodegradable and recyclable materials</li>
                <li>Water-resistant and tear-proof construction</li>
                <li>Custom logo printing with up to 8 colors</li>
                <li>Available in multiple sizes and colors</li>
                <li>Reinforced handles for heavy loads</li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-3">Need Customization?</h3>
              <p className="text-sm text-gray-600 mb-4">Tell us your requirements and we'll provide a tailored quotation within 24 hours.</p>
              <div className="space-y-3">
                <Input placeholder="Your name" variant="filled" />
                <Input placeholder="Email address" variant="filled" />
                <Select
                  placeholder="Bag type"
                  style={{ width: '100%' }}
                  variant="filled"
                  options={[
                    { value: 'eco', label: 'Eco Shopping Bag' },
                    { value: 'tote', label: 'Cotton Tote Bag' },
                    { value: 'draw', label: 'Drawstring Bag' },
                  ]}
                />
                <Input.TextArea placeholder="Your requirements (quantity, size, printing...)" variant="filled" rows={3} />
                <button onClick={() => openInquiry('inquiry')} className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 mt-1">
                  Send Inquiry
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Response within 24 hours
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { img: 'photo-1553062407-98eeb64c6a62', name: 'Cotton Tote Bag', price: '$1.20–2.00' },
              { img: 'photo-1584917865442-de89df76afd3', name: 'Drawstring Bag', price: '$0.50–0.80' },
              { img: 'photo-1491637639811-60e2756cc1c7', name: 'Canvas Tote Bag', price: '$1.50–2.50' },
              { img: 'photo-1593642632559-0c6d3fc62b89', name: 'Non-woven Bag', price: '$0.30–0.60' },
            ].map((p, i) => (
              <div key={i} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="overflow-hidden bg-gray-50 h-36">
                  <img src={`https://images.unsplash.com/${p.img}?w=200&h=160&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-gray-900">{p.name}</h3>
                  <div className="text-primary font-bold text-sm mt-1">{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs">
          © 2026 EcoBags. All rights reserved. | Privacy Policy | Terms of Service
        </div>
      </footer>

      {/* Inquiry Modal */}
      {inquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInquiryOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-gray-900">{inquiryType === 'inquiry' ? 'Send Inquiry' : 'Request Sample'}</h3>
              </div>
              <button onClick={() => setInquiryOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <img src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=80&h=80&fit=crop&auto=format" alt="" className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h4 className="font-bold text-gray-900">Eco Shopping Bag</h4>
                  <p className="text-sm text-gray-500">$0.80 – $1.20 / pcs</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Name *</label>
                  <Input value={inquiryForm.name} onChange={e => setInquiryForm({ ...inquiryForm, name: e.target.value })} placeholder="Your name" variant="filled" size="middle" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Email *</label>
                  <Input value={inquiryForm.email} onChange={e => setInquiryForm({ ...inquiryForm, email: e.target.value })} placeholder="you@company.com" variant="filled" size="middle" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Company</label>
                <Input value={inquiryForm.company} onChange={e => setInquiryForm({ ...inquiryForm, company: e.target.value })} placeholder="Company name" variant="filled" size="middle" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Bag Type</label>
                <Select
                  value={inquiryForm.bagType || undefined}
                  onChange={v => setInquiryForm({ ...inquiryForm, bagType: v })}
                  placeholder="Select bag type"
                  style={{ width: '100%' }}
                  variant="filled"
                  options={[
                    { value: 'eco', label: 'Eco Shopping Bag' },
                    { value: 'tote', label: 'Cotton Tote Bag' },
                    { value: 'draw', label: 'Drawstring Bag' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Requirements</label>
                <Input.TextArea value={inquiryForm.requirements} onChange={e => setInquiryForm({ ...inquiryForm, requirements: e.target.value })} placeholder="Quantity, size, printing details..." variant="filled" rows={3} />
              </div>
              {inquiryType === 'sample' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Truck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Sample production takes 3-5 days. Shipping cost will be quoted separately.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setInquiryOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100">Cancel</button>
              <button onClick={handleSendInquiry} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />{inquiryType === 'inquiry' ? 'Send Inquiry' : 'Request Sample'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProductDetailPage;
