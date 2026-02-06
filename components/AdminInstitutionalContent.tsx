import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, CheckCircle, AlertTriangle, Loader2, Image as ImageIcon, Tag, FileText, Save } from 'lucide-react';
import { Button } from './Button';
import { MobileTabsSelect } from './MobileTabsSelect';
import * as cloud from '../services/cloud';
import { InstitutionalContent, InstitutionalPageKey, InstitutionalCategory, InstitutionalTag, InstitutionalContentVersion, ContentStatus } from '../types';
import { useDialog } from '../utils/dialogService';

const pageOptions: { key: InstitutionalPageKey; label: string }[] = [
  { key: 'landing', label: 'Página Inicial' },
  { key: 'faq', label: 'Perguntas Frequentes' },
  { key: 'solutions', label: 'Soluções para seu negócio' },
  { key: 'benefits', label: 'Benefícios Zé Entregas' },
  { key: 'about', label: 'Sobre o Zé Entregas' }
];

export const AdminInstitutionalContent: React.FC = () => {
  const [pageKey, setPageKey] = useState<InstitutionalPageKey>('faq');
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  const [categories, setCategories] = useState<InstitutionalCategory[]>([]);
  const [tags, setTags] = useState<InstitutionalTag[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL' | 'NONE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InstitutionalContent | null>(null);
  const [previewItem, setPreviewItem] = useState<InstitutionalContent | null>(null);
  const [versions, setVersions] = useState<InstitutionalContentVersion[]>([]);
  const [saving, setSaving] = useState(false);
  const { confirm, alert } = useDialog();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cats, tgs] = await Promise.all([
          cloud.adminListInstitutionalCategories(),
          cloud.adminListInstitutionalTags()
        ]);
        setCategories(cats);
        setTags(tgs);
      } finally { }
      await refresh();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => { refresh(); }, [pageKey, statusFilter, categoryFilter, search]);

  const refresh = async () => {
    const catId = categoryFilter === 'ALL' ? undefined : categoryFilter === 'NONE' ? null : categoryFilter;
    const data = await cloud.adminListInstitutionalContents({ pageKey, status: statusFilter, categoryId: catId, search });
    setItems(data);
  };

  const filteredTags = useMemo(() => tags, [tags]);

  const [form, setForm] = useState<Partial<InstitutionalContent>>({ page_key: 'faq', title: '', description: '', slug: '', status: 'draft', is_active: true, order_index: 0 });
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formImages, setFormImages] = useState<(File | { storage_path: string; alt_text?: string; order_index?: number })[]>([]);

  const validateForm = (): boolean => {
    return !!form.page_key && !!form.title && !!form.slug;
  };

  const handleCreate = async () => {
    if (!validateForm()) { await alert({ title: 'Aviso', message: 'Preencha título e slug.' }); return; }
    setSaving(true);
    try {
      const created = await cloud.adminCreateInstitutionalContent({ base: form, images: formImages, tagIds: formTagIds });
      if (created) {
        await alert({ title: 'Sucesso', message: 'Conteúdo criado com sucesso!' });
        setCreating(false);
        setForm({ page_key: pageKey, title: '', description: '', slug: '', status: 'draft', is_active: true, order_index: 0 });
        setFormImages([]);
        setFormTagIds([]);
        await refresh();
      }
    } catch (e: any) {
      await alert({ title: 'Erro', message: e.message || 'Erro ao criar conteúdo.' });
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await cloud.adminUpdateInstitutionalContent(editing.id, { title: editing.title, description: editing.description, slug: editing.slug, status: editing.status, is_active: editing.is_active, order_index: editing.order_index, category_id: editing.category_id, metadata: editing.metadata });
      await alert({ title: 'Sucesso', message: 'Conteúdo atualizado com sucesso!' });
      const vers = await cloud.adminGetInstitutionalVersions(editing.id);
      setVersions(vers);
      await refresh();
    } catch (e: any) {
      await alert({ title: 'Erro', message: e.message || 'Erro ao atualizar conteúdo.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: InstitutionalContent) => {
    const isConfirmed = await confirm({
      title: 'Confirmar Exclusão',
      message: 'Confirma excluir este conteúdo? Um backup será gerado automaticamente.',
      confirmButtonText: 'Excluir'
    });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      await cloud.adminDeleteInstitutionalContent(item.id);
      await alert({ title: 'Sucesso', message: 'Conteúdo excluído com sucesso!' });
      await refresh();
    } catch (e: any) {
      await alert({ title: 'Erro', message: e.message || 'Erro ao excluir conteúdo.' });
    } finally { setSaving(false); }
  };

  const handleTogglePublish = async (item: InstitutionalContent, next: ContentStatus) => {
    setSaving(true);
    try {
      await cloud.adminSetInstitutionalStatus(item.id, next);
      await alert({ title: 'Sucesso', message: next === 'published' ? 'Conteúdo publicado com sucesso!' : 'Status atualizado com sucesso!' });
      await refresh();
    } catch (e: any) {
      await alert({ title: 'Erro', message: e.message || 'Erro ao alterar status.' });
    } finally { setSaving(false); }
  };

  const openEdit = async (item: InstitutionalContent) => {
    setEditing(item);
    const vers = await cloud.adminGetInstitutionalVersions(item.id);
    setVersions(vers);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <MobileTabsSelect
          value={pageKey}
          onChange={(val) => {
            const next = val as InstitutionalPageKey;
            setPageKey(next);
            setForm(prev => ({ ...prev, page_key: next }));
          }}
          options={pageOptions.map(p => ({ value: p.key, label: p.label }))}
          label="Página"
          className="md:hidden w-full"
        />
        <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar">
          {pageOptions.map(p => (
            <button key={p.key} onClick={() => { setPageKey(p.key); setForm(prev => ({ ...prev, page_key: p.key })); }} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${pageKey === p.key ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." className="pl-10 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
            <option value="all">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="disabled">Desativado</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
            <option value="ALL">Todas categorias</option>
            <option value="NONE">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> Novo conteúdo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" /></div>
        ) : items.length === 0 ? (
          <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-2xl text-gray-400 border border-dashed border-gray-200 dark:border-gray-700">Nenhum conteúdo encontrado.</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.page_key}</span>
                  <span className={`text-xs px-2 py-1 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : item.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{item.status}</span>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white truncate">{item.title}</h4>
                {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                  {item.tags && item.tags.map(t => <span key={t.id} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700"><Tag className="w-3 h-3 inline mr-1" />{t.name}</span>)}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto justify-end">
                <Button size="sm" variant="outline" onClick={() => setPreviewItem(item)}><Eye className="w-3 h-3 mr-1.5" /> Pré-visualizar</Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Edit2 className="w-3 h-3 mr-1.5" /> Editar</Button>
                {item.status !== 'published' ? (
                  <Button size="sm" onClick={() => handleTogglePublish(item, 'published')}><CheckCircle className="w-3 h-3 mr-1.5" /> Publicar</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleTogglePublish(item, 'disabled')}>Desativar</Button>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(item)}><Trash2 className="w-3 h-3 mr-1.5" /> Excluir</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Novo Conteúdo</h3>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Página</label>
              <select value={form.page_key as any} onChange={e => setForm(prev => ({ ...prev, page_key: e.target.value as any }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
                {pageOptions.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
              <input value={form.title || ''} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Título" className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
              <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              <label className="text-xs font-bold text-gray-500 uppercase">Slug</label>
              <input value={form.slug || ''} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="slug-exemplo" className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
              <select value={form.category_id || ''} onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value || null }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="text-xs font-bold text-gray-500 uppercase">Tags</label>
              <div className="flex flex-wrap gap-2">
                {filteredTags.map(t => (
                  <button key={t.id} onClick={() => setFormTagIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} className={`px-3 py-1 rounded text-xs border ${formTagIds.includes(t.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{t.name}</button>
                ))}
              </div>
              <label className="text-xs font-bold text-gray-500 uppercase">Imagens</label>
              <div className="flex items-center gap-2">
                <input type="file" onChange={e => { if (e.target.files && e.target.files[0]) setFormImages(prev => [...prev, e.target.files![0]]); }} />
                <div className="text-[10px] text-gray-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {formImages.length} selecionada(s)</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Criar</>}</Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl dark:text-white mb-4 flex items-center gap-2"><Edit2 className="w-5 h-5" /> Editar Conteúdo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
                <input value={editing.title} onChange={e => setEditing(prev => ({ ...prev!, title: e.target.value }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Slug</label>
                <input value={editing.slug} onChange={e => setEditing(prev => ({ ...prev!, slug: e.target.value }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                <textarea value={editing.description || ''} onChange={e => setEditing(prev => ({ ...prev!, description: e.target.value }))} rows={4} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                <select value={editing.status} onChange={e => setEditing(prev => ({ ...prev!, status: e.target.value as any }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="disabled">Desativado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ativo</label>
                <select value={editing.is_active ? 'true' : 'false'} onChange={e => setEditing(prev => ({ ...prev!, is_active: e.target.value === 'true' }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ordem</label>
                <input type="number" value={editing.order_index || 0} onChange={e => setEditing(prev => ({ ...prev!, order_index: Number(e.target.value) }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                <select value={editing.category_id || ''} onChange={e => setEditing(prev => ({ ...prev!, category_id: e.target.value || null }))} className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs">
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Controle de Versões</h4>
              <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl p-2">
                {versions.length === 0 ? <p className="text-[10px] text-gray-400">Sem histórico.</p> : versions.map(v => (
                  <div key={v.id} className="text-[10px] text-gray-500 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-1">
                    <span>v{v.version} • {new Date(v.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Fechar</Button>
              <Button onClick={handleUpdate} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Salvar</>}</Button>
            </div>
          </div>
        </div>
      )}

      {previewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl dark:text-white mb-4 flex items-center gap-2"><Eye className="w-5 h-5" /> Pré-visualização</h3>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white">{previewItem.title}</h4>
              {previewItem.description && <p className="text-sm text-gray-600 dark:text-gray-300">{previewItem.description}</p>}
              {previewItem.images && previewItem.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {previewItem.images.map(img => (
                    <img key={img.id} src={cloud.getClient()?.storage.from('public-files').getPublicUrl(img.storage_path).data.publicUrl || ''} alt={img.alt_text || ''} className="w-full h-28 object-cover rounded-xl" />
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setPreviewItem(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
