import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Download, Upload } from 'lucide-react';
import { useProviderLibrary } from '@/store/providers';
import type { ProviderConfig } from '@/types/provider';
import { isValidUrl, isValidId, isRequired } from '@/utils/validation';

export function ProviderManager() {
  const { providers, upsert, remove, exportProviders, importProviders } = useProviderLibrary();
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredProviders = normalizedSearchQuery
    ? providers.filter(
        (provider) =>
          provider.name.toLowerCase().includes(normalizedSearchQuery) ||
          provider.id.toLowerCase().includes(normalizedSearchQuery) ||
          provider.baseUrl.toLowerCase().includes(normalizedSearchQuery)
      )
    : providers;

  const handleAdd = () => {
    setEditingProvider({
      id: '',
      name: '',
      baseUrl: '',
      apiKey: '',
    });
    setShowForm(true);
  };

  const handleEdit = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个服务商吗？使用该服务商的模型将无法正常工作。')) {
      remove(id);
    }
  };

  const handleSave = (provider: ProviderConfig) => {
    upsert(provider);
    setShowForm(false);
    setEditingProvider(null);
  };

  const handleExport = () => {
    const json = exportProviders();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `providers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = importProviders(text);
      if (result.success) {
        alert('导入成功！');
      } else {
        alert(`导入失败：${result.error}`);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-700">服务商配置</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50"
            onClick={handleImport}
            title="导入"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50"
            onClick={handleExport}
            title="导出"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            onClick={handleAdd}
          >
            <Plus className="h-3 w-3" />
            添加服务商
          </button>
        </div>
      </div>

      <input
        type="text"
        className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-blue-400"
        placeholder="搜索服务商名称、ID 或 Base URL..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="flex items-start gap-2 rounded border border-zinc-200 bg-white p-2"
          >
            <div className="flex-1">
              <div className="text-xs font-semibold text-zinc-800">{provider.name}</div>
              <div className="mt-0.5 text-[10px] text-zinc-500">
                ID: {provider.id}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-500">
                Base URL: {provider.baseUrl || '(使用全局)'}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                onClick={() => handleEdit(provider)}
                title="编辑"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-red-500 hover:bg-red-50"
                onClick={() => handleDelete(provider.id)}
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filteredProviders.length === 0 && (
          <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500">
            {providers.length === 0
              ? '暂无服务商配置，点击上方按钮添加'
              : '未找到匹配的服务商'}
          </div>
        )}
      </div>

      {showForm && editingProvider && (
        <ProviderForm
          provider={editingProvider}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProvider(null);
          }}
        />
      )}
    </div>
  );
}

function ProviderForm({
  provider,
  onSave,
  onCancel,
}: {
  provider: ProviderConfig;
  onSave: (provider: ProviderConfig) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProviderConfig>(provider);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { providers } = useProviderLibrary();

  const updateDraft = <K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ID 验证
    if (!isRequired(draft.id)) {
      newErrors.id = 'ID 不能为空';
    } else if (!isValidId(draft.id)) {
      newErrors.id = 'ID 只能包含字母、数字、连字符和下划线';
    } else if (!provider.id && providers.some((p) => p.id === draft.id)) {
      newErrors.id = 'ID 已存在，请使用其他 ID';
    }

    // 名称验证
    if (!isRequired(draft.name)) {
      newErrors.name = '名称不能为空';
    }

    // Base URL 验证
    if (!isRequired(draft.baseUrl)) {
      newErrors.baseUrl = 'Base URL 不能为空';
    } else if (!isValidUrl(draft.baseUrl)) {
      newErrors.baseUrl = 'Base URL 格式不正确';
    }

    // API Key 验证
    if (!isRequired(draft.apiKey)) {
      newErrors.apiKey = 'API Key 不能为空';
    }

    // 代理 URL 验证（可选）
    if (draft.proxyUrl && !isValidUrl(draft.proxyUrl)) {
      newErrors.proxyUrl = '代理 URL 格式不正确';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="max-h-[90vh] w-[450px] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">
            {provider.id ? '编辑服务商' : '添加服务商'}
          </h3>
          <button
            type="button"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <FormField label="服务商 ID" error={errors.id}>
            <input
              type="text"
              className={inputCls}
              value={draft.id}
              onChange={(e) => updateDraft('id', e.target.value)}
              placeholder="my-openai"
              disabled={!!provider.id}
            />
          </FormField>

          <FormField label="服务商名称" error={errors.name}>
            <input
              type="text"
              className={inputCls}
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              placeholder="My OpenAI"
            />
          </FormField>

          <FormField label="Base URL" error={errors.baseUrl}>
            <input
              type="text"
              className={inputCls}
              value={draft.baseUrl}
              onChange={(e) => updateDraft('baseUrl', e.target.value)}
              placeholder="https://api.openai.com"
            />
          </FormField>

          <FormField label="API Key" error={errors.apiKey}>
            <input
              type="password"
              className={inputCls}
              value={draft.apiKey}
              onChange={(e) => updateDraft('apiKey', e.target.value)}
              placeholder="sk-..."
            />
          </FormField>

          <button
            type="button"
            className="text-left text-xs text-blue-600 hover:underline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '隐藏' : '显示'}高级配置
          </button>

          {showAdvanced && (
            <>
              <FormField label="超时时间 (ms)">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.timeout ?? ''}
                  onChange={(e) =>
                    updateDraft('timeout', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="30000"
                />
              </FormField>

              <FormField label="重试次数">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.retryCount ?? ''}
                  onChange={(e) =>
                    updateDraft('retryCount', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="3"
                />
              </FormField>

              <FormField label="重试延迟 (ms)">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.retryDelay ?? ''}
                  onChange={(e) =>
                    updateDraft('retryDelay', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="1000"
                />
              </FormField>

              <FormField label="代理 URL">
                <input
                  type="text"
                  className={inputCls}
                  value={draft.proxyUrl ?? ''}
                  onChange={(e) => updateDraft('proxyUrl', e.target.value || undefined)}
                  placeholder="http://proxy.example.com:8080"
                />
                {errors.proxyUrl && (
                  <span className="text-[10px] text-red-600">{errors.proxyUrl}</span>
                )}
              </FormField>
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-zinc-200 bg-white px-4 py-3">
          <button
            type="button"
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={handleSubmit}
          >
            保存
          </button>
          <button
            type="button"
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-600">{label}</span>
      {children}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-blue-400 disabled:bg-zinc-100 disabled:text-zinc-500';
