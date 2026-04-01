const API = '/larder/api';

// Shared table style constants
const thS = { padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--geo-text-muted)', background: 'var(--geo-border-light)', textAlign: 'left', whiteSpace: 'nowrap' };
const tdS = { padding: '7px 10px', fontSize: 13, borderTop: '1px solid var(--geo-border-light)' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function apiUpload(path, formData) {
  const res = await fetch(API + path, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------
const TABS = [
  {
    id: 'materials',
    label: '🧪 Materials',
    desc: 'Configure material recipes from base components with mass ratios and density.',
    help: [
      {
        heading: 'What you\'re looking at',
        items: [
          'Materials are recipes composed of base components with defined mass ratios.',
          'Each material also stores a density (g/mL) used for volume-to-mass calculations.',
          'Materials are stored in the geoship_manufacturing database under materials.',
        ],
      },
      {
        heading: 'Creating a material',
        items: [
          'Click "+ New" in the left panel.',
          'Enter a unique name and optional description.',
          'Set the density in g/mL (grams per millilitre).',
          'Click "+ Add Component" to add each base component, select it from the dropdown, and enter its ratio.',
          'All component ratios must sum to exactly 100%.',
          'A green checkmark appears when the total is valid.',
          'Click Save when done.',
        ],
      },
      {
        heading: 'Volume calculator',
        items: [
          'After saving a material with density and components, scroll down to the Volume Calculator section.',
          'Enter a volume (gallons by default, or switch to L or mL) to compute the required mass of each component.',
          'Formula: Total mass (g) = Volume (converted to mL) × Density (g/mL)',
          'Each component mass = Total mass × (component ratio / 100)',
          'The table updates live as you type.',
        ],
      },
      {
        heading: 'Editing and deleting',
        items: [
          'Select any material from the list to edit it.',
          'Changes are not saved until you click Save.',
          'Deleting a material does not delete the underlying components.',
        ],
      },
    ],
  },
  {
    id: 'components',
    label: '⚗️ Components',
    desc: 'Primitive material components used in material recipes.',
    help: [
      {
        heading: 'What you\'re looking at',
        items: [
          'Components are raw ingredients — the building blocks of material recipes.',
          'Each component has a name, an optional description, and can have documents attached (e.g., Safety Data Sheets).',
          'Components are stored in the geoship_manufacturing database under material_components.',
        ],
      },
      {
        heading: 'Creating a component',
        items: [
          'Click "+ New" in the left panel.',
          'Enter a unique name and an optional description.',
          'Click Save — the component is now available to use in material recipes.',
        ],
      },
      {
        heading: 'Attaching documents',
        items: [
          'Select a saved component from the list.',
          'Click "Upload Document" to attach a file — PDFs, Word docs, or any file type.',
          'Multiple documents can be attached to the same component.',
          'Click a document name to download it.',
          'Click × to permanently remove a document.',
        ],
      },
      {
        heading: 'Deleting components',
        items: [
          'A component cannot be deleted if it is referenced by any material recipe.',
          'Go to the Materials tab, remove the component from all recipes, then return here to delete it.',
        ],
      },
    ],
  },
  {
    id: 'material-schemas',
    label: '🏷 Material Schemas',
    desc: 'Define reusable property templates for material types.',
    help: [
      {
        heading: 'What you\'re looking at',
        items: [
          'Material schemas are reusable field templates that describe what additional data can be recorded about a material.',
          'Each schema has a name, description, and a list of typed properties.',
          'Schemas are stored in geoship_manufacturing under material_schemas.',
        ],
      },
      {
        heading: 'Creating a schema',
        items: [
          'Click "+ New" in the left panel.',
          'Give the schema a name and optional description.',
          'Click "+ Add Property" to define each field.',
          'Set the label, type, and whether the field is required.',
          'Click Save when done.',
          'Click "☆ Set as Default" to apply the schema to all materials.',
        ],
      },
      {
        heading: 'Property types',
        items: [
          'Text — free-form text input.',
          'Number — numeric entry with optional unit, min, and max.',
          'Scale (1–N) — click a rating on a numeric scale.',
          'Pass / Fail — a simple boolean checkbox.',
          'Select (single) — choose one option from a dropdown.',
          'Select (multi) — choose multiple options.',
        ],
      },
    ],
  },
  {
    id: 'component-schemas',
    label: '🏷 Component Schemas',
    desc: 'Define reusable property templates for component types.',
    help: [
      {
        heading: 'What you\'re looking at',
        items: [
          'Component schemas are reusable field templates that describe what data can be recorded about a type of component.',
          'Each schema has a name, description, and a list of typed properties (text, number, scale, pass/fail, select, etc.).',
          'Schemas are stored in geoship_manufacturing under component_schemas.',
        ],
      },
      {
        heading: 'Creating a schema',
        items: [
          'Click "+ New" in the left panel.',
          'Give the schema a name and optional description.',
          'Click "+ Add Property" to define each field.',
          'Set the label, type, and whether the field is required.',
          'Number fields can have a unit label and optional min/max bounds.',
          'Scale fields produce a 1–N rating input.',
          'Select and multiselect fields require you to define the option list.',
          'Click Save when done.',
        ],
      },
      {
        heading: 'Property types',
        items: [
          'Text — free-form text input.',
          'Number — numeric entry with optional unit, min, and max.',
          'Scale (1–N) — click a rating on a numeric scale.',
          'Pass / Fail — a simple boolean checkbox.',
          'Select (single) — choose one option from a dropdown.',
          'Select (multi) — choose multiple options.',
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// MasterDetail
// ---------------------------------------------------------------------------
function MasterDetail({ title, items, selectedId, onSelect, onNew, renderItem, emptyMsg, children, searchKeys = ['name'], listHeader }) {
  const [query, setQuery] = React.useState('');
  const q = query.toLowerCase();
  const filtered = q
    ? items.filter(item => searchKeys.some(k => String(item[k] || '').toLowerCase().includes(q)))
    : items;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
      <div className="geo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--geo-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--geo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
          <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onNew}>+ New</button>
        </div>
        <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--geo-border-light)' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="geo-input"
            style={{ fontSize: 12, padding: '4px 8px' }}
          />
        </div>
        {listHeader}
        {filtered.length === 0 && (
          <div className="empty" style={{ fontSize: 12, padding: '16px' }}>
            {q ? 'No matches.' : 'No items yet.'}
          </div>
        )}
        {filtered.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            style={{
              padding: '9px 14px',
              cursor: 'pointer',
              borderBottom: '1px solid var(--geo-border-light)',
              background: selectedId === item.id ? 'var(--geo-sand)' : 'transparent',
              borderLeft: `3px solid ${selectedId === item.id ? 'var(--geo-forest)' : 'transparent'}`,
              transition: 'background 0.1s',
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
      <div className="geo-card">
        {children || <div className="empty">{emptyMsg || 'Select an item or create a new one.'}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SchemaFieldInput — renders the right input for a schema property type
// ---------------------------------------------------------------------------
function SchemaFieldInput({ prop, value, onChange }) {
  if (prop.type === 'text') {
    return <input value={value || ''} onChange={e => onChange(e.target.value)} className="geo-input" placeholder={prop.required ? 'Required' : ''} />;
  }
  if (prop.type === 'number') {
    return (
      <div style={{ position: 'relative' }}>
        <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
          className="geo-input" style={prop.unit ? { paddingRight: 40 } : {}} />
        {prop.unit && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--geo-text-muted)', pointerEvents: 'none' }}>{prop.unit}</span>}
      </div>
    );
  }
  if (prop.type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 'auto' }} />
        {value ? 'Pass' : 'Fail'}
      </label>
    );
  }
  if (prop.type === 'scale') {
    const max = prop.scale_max || 5;
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} style={{
            width: 32, height: 32, borderRadius: 6,
            border: '1px solid var(--geo-border-light)',
            background: value === n ? 'var(--geo-forest)' : 'var(--geo-white)',
            color: value === n ? 'var(--geo-ceramic)' : 'var(--geo-text-primary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>{n}</button>
        ))}
      </div>
    );
  }
  if (prop.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} className="geo-input">
        <option value="">— Select —</option>
        {(prop.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (prop.type === 'multiselect') {
    const sel = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {(prop.options || []).map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={sel.includes(opt)}
              onChange={e => onChange(e.target.checked ? [...sel, opt] : sel.filter(s => s !== opt))}
              style={{ width: 'auto' }} />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// ComponentsPage
// ---------------------------------------------------------------------------
function ComponentsPage({ isActive, dirtyRef }) {
  const [components, setComponents] = React.useState([]);
  const [schemas, setSchemas]       = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null); // null | 'new' | number
  const [form, setForm] = React.useState({ name: '', description: '', category: '', schema_values: {} });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [usages, setUsages] = React.useState([]);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => { if (dirtyRef) dirtyRef.current = isDirty; }, [isDirty]);

  const selected = selectedId === 'new' ? 'new' : (components.find(c => c.id === selectedId) || null);
  const defaultSchema = schemas.find(s => s.is_default) || null;
  const allCategories = [...new Set(components.map(c => c.category).filter(Boolean))].sort();
  const schemaDrift = defaultSchema
    ? (defaultSchema.properties || []).filter(p => !(p.key in (form.schema_values || {})))
    : [];
  const filteredComponents = components
    .filter(c => showArchived ? true : !c.archived)
    .filter(c => selectedCategory ? c.category === selectedCategory : true);

  async function load() {
    const [compData, schemaData] = await Promise.all([
      apiFetch('/components/'),
      apiFetch('/component-schemas/'),
    ]);
    setComponents(compData);
    setSchemas(schemaData);
  }

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  function selectComponent(c) {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setSelectedId(c.id);
    setForm({ name: c.name, description: c.description || '', category: c.category || '', schema_values: c.schema_values || {}, archived: c.archived || false });
    setError(null);
    setIsDirty(false);
    setUsages([]);
    apiFetch(`/components/${c.id}/usages`).then(setUsages).catch(() => {});
  }

  function newComponent() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setSelectedId('new');
    setForm({ name: '', description: '', category: '', schema_values: {}, archived: false });
    setError(null);
    setIsDirty(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category.trim() || null, schema_values: form.schema_values, archived: form.archived };
      if (selectedId === 'new') {
        const created = await apiFetch('/components/', { method: 'POST', body: JSON.stringify(payload) });
        await load();
        setSelectedId(created.id);
        setForm({ name: created.name, description: created.description || '', category: created.category || '', schema_values: created.schema_values || {}, archived: created.archived || false });
      } else {
        await apiFetch(`/components/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
        await load();
      }
      setIsDirty(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function deleteComponent() {
    if (!confirm(`Delete component "${selected.name}"?`)) return;
    try {
      await apiFetch(`/components/${selectedId}`, { method: 'DELETE' });
      await load();
      setSelectedId(null);
      setIsDirty(false);
    } catch (e) { alert(e.message); }
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await apiUpload(`/components/${selectedId}/documents`, fd);
      }
      await load();
    } catch (e) { alert(e.message); }
    setUploading(false);
    e.target.value = '';
  }

  async function deleteDocument(docId) {
    if (!confirm('Remove this document?')) return;
    try {
      await apiFetch(`/components/${selectedId}/documents/${docId}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(e.message); }
  }

  const currentDocs = (selected && selected !== 'new') ? (selected.documents || []) : [];

  return (
    <div className="geo-container" style={{ paddingTop: '1rem' }}>
      <MasterDetail
        title="Components"
        items={filteredComponents}
        searchKeys={['name', 'description', 'category']}
        selectedId={selectedId !== 'new' ? selectedId : null}
        onSelect={selectComponent}
        onNew={newComponent}
        listHeader={(
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--geo-border-light)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {allCategories.length > 0 && <>
              <button onClick={() => setSelectedCategory(null)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--geo-border-light)', background: selectedCategory === null ? 'var(--geo-forest)' : 'transparent', color: selectedCategory === null ? 'white' : 'var(--geo-text-muted)', cursor: 'pointer' }}>All</button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--geo-border-light)', background: selectedCategory === cat ? 'var(--geo-forest)' : 'transparent', color: selectedCategory === cat ? 'white' : 'var(--geo-text-muted)', cursor: 'pointer' }}>{cat}</button>
              ))}
              <span style={{ borderLeft: '1px solid var(--geo-border-light)', alignSelf: 'stretch', margin: '0 2px' }} />
            </>}
            <button onClick={() => setShowArchived(a => !a)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--geo-border-light)', background: showArchived ? '#b84a3a' : 'transparent', color: showArchived ? 'white' : 'var(--geo-text-muted)', cursor: 'pointer' }}>
              {showArchived ? '☑ archived' : '☐ archived'}
            </button>
          </div>
        )}
        renderItem={c => (
          <div style={{ opacity: c.archived ? 0.55 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--geo-text-primary)' }}>{c.name}</span>
              {c.category && <span style={{ fontSize: 10, background: 'var(--geo-ceramic)', color: 'white', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>{c.category}</span>}
              {c.archived && <span style={{ fontSize: 10, background: '#888', color: 'white', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>archived</span>}
            </div>
            {c.description && (
              <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>
            )}
            {(c.documents || []).length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--geo-text-muted)', marginTop: 2 }}>
                📎 {c.documents.length} doc{c.documents.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
        emptyMsg="Select a component or create a new one."
      >
        {selected && (
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--geo-forest)' }}>
              {selected === 'new' ? 'New Component' : `Edit — ${selected.name}`}
            </h3>
            {usages.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', marginBottom: 10, padding: '5px 10px', background: 'var(--geo-sand)', borderRadius: 6 }}>
                Used in: {usages.map((m, i) => <span key={m.id}>{i > 0 && ', '}<strong>{m.name}</strong></span>)}
              </div>
            )}
            {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setIsDirty(true); }}
                className="geo-input"
                placeholder="e.g. Portland Cement"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => { setForm({ ...form, description: e.target.value }); setIsDirty(true); }}
                className="geo-input"
                rows={3}
                placeholder="Optional description or notes"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                list="component-categories"
                value={form.category}
                onChange={e => { setForm({ ...form, category: e.target.value }); setIsDirty(true); }}
                className="geo-input"
                placeholder="e.g. Binder, Aggregate, Pigment"
              />
              <datalist id="component-categories">
                {allCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>

            {defaultSchema && (
              <div style={{ marginTop: 20 }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>
                  {defaultSchema.name}
                  {defaultSchema.description && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>— {defaultSchema.description}</span>}
                </div>
                {schemaDrift.length > 0 && (
                  <div style={{ fontSize: 12, color: '#b84a3a', background: '#fff3f0', border: '1px solid #f5c6c0', borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
                    ⚠ {schemaDrift.length} new field{schemaDrift.length > 1 ? 's' : ''} not yet filled: {schemaDrift.map(p => p.label).join(', ')}
                  </div>
                )}
                {(defaultSchema.properties || []).map(prop => (
                  <div key={prop.key} className="form-group">
                    <label style={{ display: 'flex', gap: 4 }}>
                      {prop.label}
                      {prop.required && <span style={{ color: '#b84a3a', fontWeight: 700 }}>*</span>}
                    </label>
                    <SchemaFieldInput
                      prop={prop}
                      value={form.schema_values[prop.key]}
                      onChange={v => { setForm(f => ({ ...f, schema_values: { ...f.schema_values, [prop.key]: v } })); setIsDirty(true); }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setSelectedId(null); setError(null); setIsDirty(false); }} className="btn btn-secondary">Cancel</button>
              {selected !== 'new' && (
                <button
                  onClick={() => { setForm(f => ({ ...f, archived: !f.archived })); setIsDirty(true); }}
                  className="btn btn-secondary"
                  style={form.archived ? { background: '#e8f5e9', color: '#27ae60' } : {}}
                >
                  {form.archived ? '↑ Restore' : '↓ Archive'}
                </button>
              )}
              {selected !== 'new' && (
                <button onClick={deleteComponent} className="btn btn-danger" style={{ marginLeft: 'auto' }}>Delete</button>
              )}
            </div>

            {selected !== 'new' && (
              <div style={{ marginTop: 28 }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>Documents</div>
                {currentDocs.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                    No documents attached.
                  </div>
                )}
                {currentDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--geo-border-light)' }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <a
                      href={`${API}/components/${selectedId}/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, fontSize: 13, color: 'var(--geo-forest)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {doc.name}
                    </a>
                    <span style={{ fontSize: 11, color: 'var(--geo-text-muted)', whiteSpace: 'nowrap' }}>
                      {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      title="Remove document"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--geo-text-muted)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    disabled={uploading}
                    className="btn btn-secondary"
                    style={{ fontSize: 12 }}
                  >
                    {uploading ? 'Uploading…' : '📎 Upload Document'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </MasterDetail>
    </div>
  );
}


// ---------------------------------------------------------------------------
// MaterialsPage
// ---------------------------------------------------------------------------
function MaterialsPage({ isActive, dirtyRef }) {
  const [materials, setMaterials] = React.useState([]);
  const [allComponents, setAllComponents] = React.useState([]);
  const [matSchemas, setMatSchemas]       = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [form, setForm] = React.useState({ name: '', description: '', density: '', components: [], sub_materials: [], schema_values: {}, archived: false });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [volume, setVolume] = React.useState('');
  const [volUnit, setVolUnit] = React.useState('gal');
  const [calcMode, setCalcMode] = React.useState('volume'); // 'volume' | 'mass'
  const [directMass, setDirectMass] = React.useState('');
  const [variantForm, setVariantForm] = React.useState(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [versions, setVersions] = React.useState([]);
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsLoading, setVersionsLoading] = React.useState(false);
  const [versionIdx, setVersionIdx] = React.useState(0);
  const [printConfig, setPrintConfig] = React.useState(null);
  const [showArchived, setShowArchived] = React.useState(false);

  React.useEffect(() => { if (dirtyRef) dirtyRef.current = isDirty; }, [isDirty]);

  const selected = selectedId === 'new' ? 'new' : (materials.find(m => m.id === selectedId) || null);
  const defaultMatSchema = matSchemas.find(s => s.is_default) || null;
  const matSchemaDrift = defaultMatSchema
    ? (defaultMatSchema.properties || []).filter(p => !(p.key in (form.schema_values || {})))
    : [];
  const filteredMaterials = materials.filter(m => showArchived ? true : !m.archived);

  async function load() {
    const [mats, comps, schemas] = await Promise.all([
      apiFetch('/materials/'),
      apiFetch('/components/'),
      apiFetch('/material-schemas/'),
    ]);
    setMaterials(mats);
    setAllComponents(comps);
    setMatSchemas(schemas);
  }

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  function selectMaterial(m) {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setSelectedId(m.id);
    setForm({
      name: m.name,
      description: m.description || '',
      density: m.density != null ? String(m.density) : '',
      components: (m.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio), is_variable: c.is_variable || false, alternates: c.alternates || [] })),
      sub_materials: (m.sub_materials || []).map(s => ({ material_id: String(s.material_id), ratio: String(s.ratio) })),
      schema_values: m.schema_values || {},
      variant_of: m.variant_of || null,
      archived: m.archived || false,
    });
    setError(null);
    setVolume('');
    setDirectMass('');
    setVariantForm(null);
    setIsDirty(false);
    setVersions([]);
    setVersionsOpen(false);
    setVersionIdx(0);
    setPrintConfig(null);
  }

  function newMaterial() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setSelectedId('new');
    setForm({ name: '', description: '', density: '', components: [], sub_materials: [], schema_values: {}, variant_of: null, archived: false });
    setError(null);
    setVolume('');
    setDirectMass('');
    setVariantForm(null);
    setIsDirty(false);
    setVersions([]);
    setVersionsOpen(false);
    setVersionIdx(0);
    setPrintConfig(null);
  }

  async function loadVersions(matId) {
    setVersionsLoading(true);
    try {
      const data = await apiFetch(`/materials/${matId}/versions`);
      setVersions(data);
      setVersionIdx(0);
    } catch (e) { /* ignore */ }
    setVersionsLoading(false);
  }

  function restoreVersion(v) {
    const d = v.data || {};
    setForm({
      name:         d.name || '',
      description:  d.description || '',
      density:      d.density != null ? String(d.density) : '',
      components:   (d.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio), is_variable: c.is_variable || false, alternates: c.alternates || [] })),
      sub_materials: (d.sub_materials || []).map(s => ({ material_id: String(s.material_id), ratio: String(s.ratio) })),
      schema_values: d.schema_values || {},
      variant_of:   d.variant_of || null,
      archived:     d.archived || false,
    });
    setIsDirty(true);
  }

  function addComponentEntry() {
    setForm(f => ({ ...f, components: [...f.components, { component_id: '', ratio: '', is_variable: false, alternates: [] }] }));
    setIsDirty(true);
  }

  function addAlternate(idx, compId) {
    setForm(f => {
      const comps = [...f.components];
      const alts = [...(comps[idx].alternates || [])];
      if (!alts.includes(compId)) alts.push(compId);
      comps[idx] = { ...comps[idx], alternates: alts };
      return { ...f, components: comps };
    });
    setIsDirty(true);
  }

  function removeAlternate(idx, compId) {
    setForm(f => {
      const comps = [...f.components];
      comps[idx] = { ...comps[idx], alternates: (comps[idx].alternates || []).filter(id => id !== compId) };
      return { ...f, components: comps };
    });
    setIsDirty(true);
  }

  function removeComponentEntry(idx) {
    setForm(f => ({ ...f, components: f.components.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }

  function addSubMaterialEntry() {
    setForm(f => ({ ...f, sub_materials: [...f.sub_materials, { material_id: '', ratio: '' }] }));
    setIsDirty(true);
  }

  function removeSubMaterialEntry(idx) {
    setForm(f => ({ ...f, sub_materials: f.sub_materials.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }

  function updateSubEntry(idx, field, value) {
    setForm(f => {
      const subs = [...f.sub_materials];
      subs[idx] = { ...subs[idx], [field]: value };
      return { ...f, sub_materials: subs };
    });
    setIsDirty(true);
  }

  function updateEntry(idx, field, value) {
    setForm(f => {
      const comps = [...f.components];
      comps[idx] = { ...comps[idx], [field]: value };
      return { ...f, components: comps };
    });
    setIsDirty(true);
  }

  const ratioTotal = form.components.reduce((sum, c) => sum + (parseFloat(c.ratio) || 0), 0)
    + form.sub_materials.reduce((sum, s) => sum + (parseFloat(s.ratio) || 0), 0);
  const ratioValid = (form.components.length === 0 && form.sub_materials.length === 0) || Math.abs(ratioTotal - 100) < 0.01;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:          form.name.trim(),
        description:   form.description.trim() || null,
        density:       form.density !== '' ? parseFloat(form.density) : null,
        components:    form.components.map(c => ({
          component_id: parseInt(c.component_id),
          ratio:        parseFloat(c.ratio),
          is_variable:  c.is_variable || false,
          alternates:   (c.alternates || []).map(id => parseInt(id)),
        })),
        sub_materials: form.sub_materials.map(s => ({
          material_id: parseInt(s.material_id),
          ratio:       parseFloat(s.ratio),
        })),
        schema_values: form.schema_values,
        variant_of:    form.variant_of || null,
        archived:      form.archived,
      };
      if (selectedId === 'new') {
        const created = await apiFetch('/materials/', { method: 'POST', body: JSON.stringify(payload) });
        await load();
        setSelectedId(created.id);
        setForm({
          name: created.name, description: created.description || '',
          density: created.density != null ? String(created.density) : '',
          components: (created.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio), is_variable: c.is_variable || false, alternates: c.alternates || [] })),
          sub_materials: (created.sub_materials || []).map(s => ({ material_id: String(s.material_id), ratio: String(s.ratio) })),
          schema_values: created.schema_values || {},
          variant_of: created.variant_of || null,
          archived: created.archived || false,
        });
      } else {
        await apiFetch(`/materials/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
        await load();
      }
      setIsDirty(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function deleteMaterial() {
    if (!confirm(`Delete material "${selected.name}"?`)) return;
    try {
      await apiFetch(`/materials/${selectedId}`, { method: 'DELETE' });
      await load();
      setSelectedId(null);
      setIsDirty(false);
    } catch (e) { alert(e.message); }
  }

  async function duplicateMaterial() {
    if (!savedMat) return;
    try {
      const created = await apiFetch(`/materials/${savedMat.id}/duplicate`, { method: 'POST' });
      await load();
      selectMaterial(created);
    } catch (e) { alert(e.message); }
  }

  async function createVariant() {
    if (!variantForm || !variantForm.name.trim() || !savedMat) return;
    setSaving(true);
    setError(null);
    try {
      const components = (savedMat.components || []).map((slot, i) => ({
        component_id: variantForm.swaps[i] !== undefined ? variantForm.swaps[i] : slot.component_id,
        ratio:        slot.ratio,
        is_variable:  false,
        alternates:   [],
      }));
      const payload = {
        name:          variantForm.name.trim(),
        description:   savedMat.description || null,
        density:       savedMat.density || null,
        components,
        sub_materials: savedMat.sub_materials || [],
        schema_values: savedMat.schema_values || {},
        variant_of:    savedMat.id,
        archived:      false,
      };
      const created = await apiFetch('/materials/', { method: 'POST', body: JSON.stringify(payload) });
      await load();
      setVariantForm(null);
      setSelectedId(created.id);
      setForm({
        name: created.name, description: created.description || '',
        density: created.density != null ? String(created.density) : '',
        components: (created.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio), is_variable: false, alternates: [] })),
        sub_materials: (created.sub_materials || []).map(s => ({ material_id: String(s.material_id), ratio: String(s.ratio) })),
        schema_values: created.schema_values || {},
        variant_of: created.variant_of || null,
        archived: false,
      });
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  // Volume calculator — uses saved material data
  const savedMat = selected && selected !== 'new' ? selected : null;
  const VOL_TO_ML = { gal: 3785.41, L: 1000, mL: 1 };
  const volNum = parseFloat(volume);
  const volMl = !isNaN(volNum) && volNum > 0 ? volNum * VOL_TO_ML[volUnit] : null;
  const densityNum = savedMat ? parseFloat(savedMat.density) : NaN;
  const totalMass = (volMl != null && !isNaN(densityNum) && densityNum > 0)
    ? volMl * densityNum
    : null;
  const directMassNum = parseFloat(directMass);
  const effectiveTotalMass = calcMode === 'volume' ? totalMass : (!isNaN(directMassNum) && directMassNum > 0 ? directMassNum : null);

  function printRecipeCard(cfg) {
    if (!savedMat) return;
    const m = savedMat;
    const VOL_TO_ML_PRINT = { gal: 3785.41, L: 1000, mL: 1 };

    const compEntries = (m.components || []).map(entry => ({
      name: (allComponents.find(c => c.id === entry.component_id) || {}).name || `Component #${entry.component_id}`,
      ratio: entry.ratio,
      is_variable: entry.is_variable,
    }));

    // Ratio summary table (always shown)
    const compRows = compEntries.map(e =>
      `<tr><td>${e.name}</td><td style="text-align:right">${e.ratio}%</td><td>${e.is_variable ? '<em>variable</em>' : ''}</td></tr>`
    ).join('');

    // Volume range table
    let rangeHtml = '';
    if (m.density && compEntries.length > 0 && cfg) {
      const start = parseFloat(cfg.start);
      const end   = parseFloat(cfg.end);
      const inc   = parseFloat(cfg.increment);
      const unit  = cfg.unit;
      const mlPerUnit = VOL_TO_ML_PRINT[unit] || 1;

      if (!isNaN(start) && !isNaN(end) && !isNaN(inc) && inc > 0 && end >= start) {
        const steps = Math.round((end - start) / inc);
        const headerCells = compEntries.map(e => `<th style="text-align:right">${e.name} (g)</th>`).join('') + '<th style="text-align:right">Total (g)</th>';
        const bodyRows = [];
        for (let i = 0; i <= steps; i++) {
          const vol = parseFloat((start + i * inc).toFixed(8));
          const volMl = vol * mlPerUnit;
          const totalMass = volMl * m.density;
          const cells = compEntries.map(e =>
            `<td style="text-align:right">${(totalMass * e.ratio / 100).toFixed(1)}</td>`
          ).join('');
          bodyRows.push(`<tr><td><strong>${vol} ${unit}</strong></td>${cells}<td style="text-align:right;font-weight:700">${totalMass.toFixed(1)}</td></tr>`);
        }
        rangeHtml = `<h2>Component Masses by Volume (${start}–${end} ${unit}, Δ${inc})</h2>
<table>
  <thead><tr><th>Volume</th>${headerCells}</tr></thead>
  <tbody>${bodyRows.join('')}</tbody>
</table>`;
      }
    }

    const schemaRows = defaultMatSchema
      ? (defaultMatSchema.properties || [])
          .filter(p => m.schema_values && m.schema_values[p.key] != null)
          .map(p => {
            const val = m.schema_values[p.key];
            const display = Array.isArray(val) ? val.join(', ') : String(val);
            return `<tr><td>${p.label}${p.unit ? ` (${p.unit})` : ''}</td><td>${display}</td></tr>`;
          }).join('')
      : '';

    const variantOfName = m.variant_of ? ((materials.find(x => x.id === m.variant_of) || {}).name || `#${m.variant_of}`) : null;
    const childVariants = materials.filter(v => v.variant_of === m.id);

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Recipe Card — ${m.name}</title>
<style>
  body { font-family: Georgia, serif; max-width: 900px; margin: 40px auto; color: #222; line-height: 1.5; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #777; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 28px 0 10px; }
  p.meta { font-size: 13px; color: #555; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
  th { background: #f5f5f5; text-align: left; padding: 5px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; white-space: nowrap; }
  td { padding: 5px 10px; border-top: 1px solid #eee; white-space: nowrap; }
  tr:nth-child(even) td { background: #fafafa; }
  .print-btn { margin-bottom: 24px; padding: 8px 20px; background: #2d5a27; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  .footer { font-size: 11px; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { .print-btn { display: none; } body { margin: 16px; } }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨 Print</button>
<h1>${m.name}</h1>
${m.description ? `<p class="meta">${m.description}</p>` : ''}
${m.density != null ? `<p class="meta">Density: <strong>${m.density} g/mL</strong></p>` : ''}
${variantOfName ? `<p class="meta">Variant of: <strong>${variantOfName}</strong></p>` : ''}

${compRows ? `<h2>Components</h2>
<table>
  <thead><tr><th>Component</th><th style="text-align:right">Ratio</th><th>Notes</th></tr></thead>
  <tbody>${compRows}</tbody>
</table>` : ''}

${rangeHtml}

${schemaRows ? `<h2>${defaultMatSchema ? defaultMatSchema.name : 'Properties'}</h2>
<table><tbody>${schemaRows}</tbody></table>` : ''}

${childVariants.length > 0 ? `<h2>Variants</h2><ul style="font-size:13px;margin:0;padding-left:20px">${childVariants.map(v => `<li>${v.name}</li>`).join('')}</ul>` : ''}

<div class="footer">Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; Larder</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  return (
    <div className="geo-container" style={{ paddingTop: '1rem' }}>
      <MasterDetail
        title="Materials"
        items={filteredMaterials}
        searchKeys={['name', 'description']}
        selectedId={selectedId !== 'new' ? selectedId : null}
        onSelect={selectMaterial}
        onNew={newMaterial}
        listHeader={(
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--geo-border-light)' }}>
            <button onClick={() => setShowArchived(a => !a)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--geo-border-light)', background: showArchived ? '#b84a3a' : 'transparent', color: showArchived ? 'white' : 'var(--geo-text-muted)', cursor: 'pointer' }}>
              {showArchived ? '☑ archived' : '☐ archived'}
            </button>
          </div>
        )}
        renderItem={m => (
          <div style={{ opacity: m.archived ? 0.55 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--geo-text-primary)' }}>{m.name}</span>
              {m.variant_of && <span style={{ fontSize: 10, background: 'var(--geo-ceramic)', color: 'white', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>variant</span>}
              {m.archived && <span style={{ fontSize: 10, background: '#888', color: 'white', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>archived</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 1 }}>
              {m.density != null ? `${m.density} g/mL` : 'No density'}
              {' · '}
              {(m.components || []).length} component{(m.components || []).length !== 1 ? 's' : ''}
              {m.version != null ? ` · v${m.version}` : ''}
            </div>
          </div>
        )}
        emptyMsg="Select a material or create a new one."
      >
        {selected && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--geo-forest)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {selected === 'new' ? 'New Material' : `Edit — ${selected.name}`}
              {savedMat && savedMat.version != null && (
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--geo-forest)', color: 'white', borderRadius: 8, padding: '1px 7px' }}>v{savedMat.version}</span>
              )}
            </h3>
            {savedMat && savedMat.variant_of && (
              <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', marginBottom: 12 }}>
                Variant of:{' '}
                <strong style={{ color: 'var(--geo-forest)' }}>
                  {(materials.find(m => m.id === savedMat.variant_of) || {}).name || `Material #${savedMat.variant_of}`}
                </strong>
                <button
                  onClick={() => { const base = materials.find(m => m.id === savedMat.variant_of); if (base) selectMaterial(base); }}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--geo-forest)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
                >View base</button>
              </div>
            )}
            {!savedMat?.variant_of && <div style={{ marginBottom: 12 }} />}
            {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="form-row cols-2" style={{ marginBottom: 4 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Name</label>
                <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setIsDirty(true); }} className="geo-input" placeholder="e.g. Fiber Mix A" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setIsDirty(true); }} className="geo-input" rows={2} placeholder="Optional notes" />
              </div>
              <div className="form-group">
                <label>Density (g/mL)</label>
                <input type="number" step="0.001" min="0" value={form.density} onChange={e => { setForm({ ...form, density: e.target.value }); setIsDirty(true); }} className="geo-input" placeholder="e.g. 1.5" />
              </div>
            </div>

            <div className="geo-section-label" style={{ marginTop: 8 }}>Components</div>
            {form.components.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '6px 0 10px' }}>
                No components added yet.
              </div>
            )}
            {form.components.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto 28px', gap: 8, alignItems: 'center' }}>
                  <select value={entry.component_id} onChange={e => updateEntry(idx, 'component_id', e.target.value)} className="geo-input">
                    <option value="">— Select component —</option>
                    {allComponents.filter(c => !c.archived || c.id === parseInt(entry.component_id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (archived)' : ''}</option>
                    ))}
                  </select>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={entry.ratio}
                      onChange={e => updateEntry(idx, 'ratio', e.target.value)}
                      className="geo-input"
                      placeholder="0"
                      style={{ paddingRight: 24 }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--geo-text-muted)', pointerEvents: 'none' }}>%</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--geo-text-muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={entry.is_variable || false}
                      onChange={e => updateEntry(idx, 'is_variable', e.target.checked)}
                    />
                    Variable
                  </label>
                  <button
                    onClick={() => removeComponentEntry(idx)}
                    style={{ background: 'none', border: '1px solid var(--geo-border-light)', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: 'var(--geo-text-muted)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
                {entry.is_variable && (
                  <div style={{ marginLeft: 4, marginTop: 5, padding: '6px 10px', background: 'var(--geo-sand)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginBottom: 4 }}>Alternates:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      {(entry.alternates || []).map(altId => {
                        const altComp = allComponents.find(c => c.id === parseInt(altId));
                        return (
                          <span key={altId} style={{ background: 'white', border: '1px solid var(--geo-border-light)', borderRadius: 12, padding: '2px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {altComp ? altComp.name : `#${altId}`}
                            <button onClick={() => removeAlternate(idx, altId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--geo-text-muted)', fontSize: 14 }}>×</button>
                          </span>
                        );
                      })}
                      <select
                        value=""
                        onChange={e => { if (e.target.value) addAlternate(idx, parseInt(e.target.value)); }}
                        className="geo-input"
                        style={{ fontSize: 11, padding: '2px 6px', height: 'auto' }}
                      >
                        <option value="">+ Add alternate</option>
                        {allComponents
                          .filter(c => c.id !== parseInt(entry.component_id) && !(entry.alternates || []).includes(c.id))
                          .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addComponentEntry} className="btn btn-secondary" style={{ fontSize: 12, marginBottom: 16 }}>
              + Add Component
            </button>

            <div className="geo-section-label" style={{ marginTop: 8 }}>Sub-Materials</div>
            {form.sub_materials.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '6px 0 10px' }}>
                No sub-materials added yet.
              </div>
            )}
            {form.sub_materials.map((entry, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <select value={entry.material_id} onChange={e => updateSubEntry(idx, 'material_id', e.target.value)} className="geo-input">
                  <option value="">— Select material —</option>
                  {materials.filter(m => !m.archived || String(m.id) === entry.material_id).filter(m => m.id !== selectedId).map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.archived ? ' (archived)' : ''}</option>
                  ))}
                </select>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={entry.ratio}
                    onChange={e => updateSubEntry(idx, 'ratio', e.target.value)}
                    className="geo-input"
                    placeholder="0"
                    style={{ paddingRight: 24 }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--geo-text-muted)', pointerEvents: 'none' }}>%</span>
                </div>
                <button
                  onClick={() => removeSubMaterialEntry(idx)}
                  style={{ background: 'none', border: '1px solid var(--geo-border-light)', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: 'var(--geo-text-muted)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ))}

            <button onClick={addSubMaterialEntry} className="btn btn-secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              + Add Sub-Material
            </button>

            {(form.components.length > 0 || form.sub_materials.length > 0) && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: ratioValid ? '#27ae60' : '#b84a3a' }}>
                Total: {ratioTotal.toFixed(2)}%{ratioValid ? ' ✓' : ' — must equal 100%'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setSelectedId(null); setError(null); setIsDirty(false); }} className="btn btn-secondary">Cancel</button>
              {selected !== 'new' && (
                <button
                  onClick={() => { setForm(f => ({ ...f, archived: !f.archived })); setIsDirty(true); }}
                  className="btn btn-secondary"
                  style={form.archived ? { background: '#e8f5e9', color: '#27ae60' } : {}}
                >
                  {form.archived ? '↑ Restore' : '↓ Archive'}
                </button>
              )}
              {savedMat && (
                <button onClick={duplicateMaterial} className="btn btn-secondary" style={{ fontSize: 12 }}>Duplicate</button>
              )}
              {savedMat && !printConfig && (
                <button
                  onClick={() => setPrintConfig({ start: '4', end: '8', increment: '0.1', unit: 'gal' })}
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                >🖨 Recipe Card</button>
              )}
              {selected !== 'new' && (
                <button onClick={deleteMaterial} className="btn btn-danger" style={{ marginLeft: 'auto' }}>Delete</button>
              )}
            </div>

            {/* Recipe Card print config */}
            {printConfig && savedMat && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--geo-sand)', borderRadius: 8, border: '1px solid var(--geo-border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--geo-forest)', marginBottom: 10 }}>🖨 Recipe Card — Volume Range</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>From</label>
                  <input
                    type="number" step="any" min="0"
                    value={printConfig.start}
                    onChange={e => setPrintConfig(c => ({ ...c, start: e.target.value }))}
                    className="geo-input" style={{ width: 70 }}
                  />
                  <label style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>to</label>
                  <input
                    type="number" step="any" min="0"
                    value={printConfig.end}
                    onChange={e => setPrintConfig(c => ({ ...c, end: e.target.value }))}
                    className="geo-input" style={{ width: 70 }}
                  />
                  <label style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>by</label>
                  <input
                    type="number" step="any" min="0.001"
                    value={printConfig.increment}
                    onChange={e => setPrintConfig(c => ({ ...c, increment: e.target.value }))}
                    className="geo-input" style={{ width: 70 }}
                  />
                  <select
                    value={printConfig.unit}
                    onChange={e => setPrintConfig(c => ({ ...c, unit: e.target.value }))}
                    className="geo-input" style={{ width: 70 }}
                  >
                    <option value="gal">gal</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                  </select>
                  <button
                    onClick={() => { printRecipeCard(printConfig); setPrintConfig(null); }}
                    className="btn btn-primary" style={{ fontSize: 12 }}
                  >Generate & Print</button>
                  <button onClick={() => setPrintConfig(null)} className="btn btn-secondary" style={{ fontSize: 12 }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Schema fields */}
            {defaultMatSchema && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--geo-border-light)' }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>
                  {defaultMatSchema.name}
                  {defaultMatSchema.description && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>— {defaultMatSchema.description}</span>}
                </div>
                {matSchemaDrift.length > 0 && (
                  <div style={{ fontSize: 12, color: '#b84a3a', background: '#fff3f0', border: '1px solid #f5c6c0', borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
                    ⚠ {matSchemaDrift.length} new field{matSchemaDrift.length > 1 ? 's' : ''} not yet filled: {matSchemaDrift.map(p => p.label).join(', ')}
                  </div>
                )}
                {(defaultMatSchema.properties || []).map(prop => (
                  <div key={prop.key} className="form-group">
                    <label style={{ display: 'flex', gap: 4 }}>
                      {prop.label}
                      {prop.required && <span style={{ color: '#b84a3a', fontWeight: 700 }}>*</span>}
                    </label>
                    <SchemaFieldInput
                      prop={prop}
                      value={form.schema_values[prop.key]}
                      onChange={v => { setForm(f => ({ ...f, schema_values: { ...f.schema_values, [prop.key]: v } })); setIsDirty(true); }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Recipe Calculator */}
            {savedMat && ((savedMat.components || []).length > 0 || (savedMat.sub_materials || []).length > 0) && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--geo-border-light)' }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>Recipe Calculator</div>

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  <button
                    onClick={() => setCalcMode('volume')}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, ...(calcMode === 'volume' ? { background: 'var(--geo-forest)', color: 'white', borderColor: 'var(--geo-forest)' } : {}) }}
                  >By Volume</button>
                  <button
                    onClick={() => setCalcMode('mass')}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, ...(calcMode === 'mass' ? { background: 'var(--geo-forest)', color: 'white', borderColor: 'var(--geo-forest)' } : {}) }}
                  >By Mass</button>
                </div>

                {calcMode === 'volume' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                      type="number" min="0" step="any"
                      value={volume}
                      onChange={e => setVolume(e.target.value)}
                      className="geo-input"
                      placeholder="0"
                      style={{ width: 120 }}
                    />
                    <select value={volUnit} onChange={e => setVolUnit(e.target.value)} className="geo-input" style={{ width: 70 }}>
                      <option value="gal">gal</option>
                      <option value="L">L</option>
                      <option value="mL">mL</option>
                    </select>
                    {savedMat.density != null ? (
                      <span style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>
                        × {savedMat.density} g/mL
                        {totalMass != null && <> = <strong style={{ color: 'var(--geo-text-primary)' }}>{fmt(totalMass)} g total</strong></>}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#b84a3a' }}>No density set — add density to use volume mode</span>
                    )}
                  </div>
                )}

                {calcMode === 'mass' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                      type="number" min="0" step="any"
                      value={directMass}
                      onChange={e => setDirectMass(e.target.value)}
                      className="geo-input"
                      placeholder="0"
                      style={{ width: 120 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>g total</span>
                    {effectiveTotalMass != null && savedMat.density != null && (
                      <span style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>
                        ≈ <strong style={{ color: 'var(--geo-text-primary)' }}>{fmt(effectiveTotalMass / (savedMat.density * VOL_TO_ML['gal']), 3)} gal</strong>
                        {' / '}
                        <strong style={{ color: 'var(--geo-text-primary)' }}>{fmt(effectiveTotalMass / savedMat.density / 1000, 2)} L</strong>
                      </span>
                    )}
                  </div>
                )}

                {effectiveTotalMass != null && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={thS}>Ingredient</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Ratio</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Mass (g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(savedMat.components || []).map((entry, i) => {
                          const comp = allComponents.find(c => c.id === entry.component_id);
                          const mass = effectiveTotalMass * (entry.ratio / 100);
                          return (
                            <tr key={i}>
                              <td style={tdS}>{comp ? comp.name : `Component #${entry.component_id}`}</td>
                              <td style={{ ...tdS, textAlign: 'right', color: 'var(--geo-text-muted)' }}>{entry.ratio}%</td>
                              <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmt(mass)}</td>
                            </tr>
                          );
                        })}
                        {(savedMat.sub_materials || []).map((entry, i) => {
                          const mat = materials.find(m => m.id === entry.material_id);
                          const mass = effectiveTotalMass * (entry.ratio / 100);
                          return (
                            <tr key={`sub-${i}`}>
                              <td style={tdS}>{mat ? mat.name : `Material #${entry.material_id}`} <span style={{ fontSize: 10, color: 'var(--geo-text-muted)' }}>(sub)</span></td>
                              <td style={{ ...tdS, textAlign: 'right', color: 'var(--geo-text-muted)' }}>{entry.ratio}%</td>
                              <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmt(mass)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--geo-sand)' }}>
                          <td style={{ ...tdS, fontWeight: 700, borderTop: '2px solid var(--geo-border-light)' }}>Total</td>
                          <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, borderTop: '2px solid var(--geo-border-light)', color: 'var(--geo-text-muted)' }}>100%</td>
                          <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, borderTop: '2px solid var(--geo-border-light)' }}>{fmt(effectiveTotalMass)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Variants */}
            {savedMat && !savedMat.variant_of && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--geo-border-light)' }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>Variants</div>
                {materials.filter(m => m.variant_of === savedMat.id).length === 0 && !variantForm && (
                  <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '4px 0 8px' }}>No variants yet.</div>
                )}
                {materials.filter(m => m.variant_of === savedMat.id).map(v => {
                  const swapDescs = (v.components || []).reduce((acc, vc, i) => {
                    const baseSlot = (savedMat.components || [])[i];
                    if (baseSlot && vc.component_id !== baseSlot.component_id) {
                      const orig = allComponents.find(c => c.id === baseSlot.component_id);
                      const repl = allComponents.find(c => c.id === vc.component_id);
                      acc.push(`${orig ? orig.name : `#${baseSlot.component_id}`} → ${repl ? repl.name : `#${vc.component_id}`}`);
                    }
                    return acc;
                  }, []);
                  return (
                    <div key={v.id} onClick={() => selectMaterial(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--geo-border-light)', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--geo-text-primary)' }}>{v.name}</div>
                        {swapDescs.length > 0 && <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 2 }}>{swapDescs.join(' · ')}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--geo-forest)' }}>→</span>
                    </div>
                  );
                })}
                {variantForm ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--geo-forest)' }}>New Variant</div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label>Name</label>
                      <input
                        value={variantForm.name}
                        onChange={e => setVariantForm(f => ({ ...f, name: e.target.value }))}
                        className="geo-input"
                        placeholder="e.g. Fiber Mix A — Blue"
                      />
                    </div>
                    {(savedMat.components || []).some(s => s.is_variable) ? (
                      (savedMat.components || []).map((slot, i) => {
                        if (!slot.is_variable) return null;
                        const baseComp = allComponents.find(c => c.id === slot.component_id);
                        const currentVal = variantForm.swaps[i] !== undefined ? variantForm.swaps[i] : slot.component_id;
                        return (
                          <div key={i} className="form-group" style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 12 }}>{baseComp ? baseComp.name : `Component #${slot.component_id}`}</label>
                            <select
                              value={currentVal}
                              onChange={e => setVariantForm(f => ({ ...f, swaps: { ...f.swaps, [i]: parseInt(e.target.value) } }))}
                              className="geo-input"
                            >
                              <option value={slot.component_id}>{baseComp ? baseComp.name : `#${slot.component_id}`} (keep original)</option>
                              {(slot.alternates || []).map(altId => {
                                const altComp = allComponents.find(c => c.id === altId);
                                return <option key={altId} value={altId}>{altComp ? altComp.name : `#${altId}`}</option>;
                              })}
                            </select>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                        No variable components defined. Mark components as Variable above to enable swaps.
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={createVariant} disabled={saving || !variantForm.name.trim()} className="btn btn-primary" style={{ fontSize: 12 }}>
                        {saving ? 'Creating…' : 'Create Variant'}
                      </button>
                      <button onClick={() => setVariantForm(null)} className="btn btn-secondary" style={{ fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setVariantForm({ name: '', swaps: {} })}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, marginTop: 10 }}
                  >+ New Variant</button>
                )}
              </div>
            )}

            {/* Version History */}
            {savedMat && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--geo-border-light)' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => {
                    const next = !versionsOpen;
                    setVersionsOpen(next);
                    if (next && versions.length === 0) loadVersions(savedMat.id);
                  }}
                >
                  <div className="geo-section-label" style={{ marginTop: 0 }}>
                    Version History{versions.length > 0 ? ` (${versions.length})` : ''}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--geo-forest)' }}>{versionsOpen ? '▲ collapse' : '▼ expand'}</span>
                </div>
                {versionsOpen && (
                  <div style={{ marginTop: 8 }}>
                    {versionsLoading && <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', padding: '8px 0' }}>Loading…</div>}
                    {!versionsLoading && versions.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '4px 0' }}>No saved versions yet. Versions are created each time you save.</div>
                    )}
                    {!versionsLoading && versions.length > 0 && (() => {
                      const cur = versions[versionIdx] || versions[0];
                      const ts = new Date(cur.saved_at);
                      const label = isNaN(ts.getTime()) ? cur.saved_at : ts.toLocaleString();
                      const d = cur.data || {};
                      return (
                        <>
                          {/* Navigator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 10px', borderBottom: '1px solid var(--geo-border-light)', marginBottom: 8 }}>
                            <button
                              onClick={() => setVersionIdx(i => Math.min(i + 1, versions.length - 1))}
                              disabled={versionIdx >= versions.length - 1}
                              className="btn btn-secondary"
                              style={{ fontSize: 12, padding: '3px 10px' }}
                            >← older</button>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--geo-text-primary)' }}>
                                {versionIdx + 1} / {versions.length}
                                {cur.version != null && <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--geo-forest)', color: 'white', borderRadius: 8, padding: '1px 6px' }}>v{cur.version}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--geo-text-muted)' }}>
                                {label}{cur.saved_by ? ` · by ${cur.saved_by}` : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => setVersionIdx(i => Math.max(i - 1, 0))}
                              disabled={versionIdx <= 0}
                              className="btn btn-secondary"
                              style={{ fontSize: 12, padding: '3px 10px' }}
                            >newer →</button>
                            <button
                              onClick={() => restoreVersion(cur)}
                              className="btn btn-secondary"
                              style={{ fontSize: 12 }}
                            >Apply</button>
                          </div>

                          {/* Details for current version */}
                          <div style={{ fontSize: 12, background: 'var(--geo-sand)', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
                            {d.density != null && <div><strong>Density:</strong> {d.density} g/mL</div>}
                            {(d.components || []).length > 0 && (
                              <div style={{ marginTop: d.density != null ? 4 : 0 }}>
                                <strong>Components:</strong>
                                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                  {(d.components || []).map((c, i) => {
                                    const comp = allComponents.find(x => x.id === c.component_id);
                                    return <li key={i} style={{ listStyle: 'disc' }}>{comp ? comp.name : `#${c.component_id}`} — {c.ratio}%</li>;
                                  })}
                                </ul>
                              </div>
                            )}
                            {(d.sub_materials || []).length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <strong>Sub-materials:</strong>
                                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                  {(d.sub_materials || []).map((s, i) => {
                                    const mat = materials.find(m => m.id === s.material_id);
                                    return <li key={i} style={{ listStyle: 'disc' }}>{mat ? mat.name : `#${s.material_id}`} — {s.ratio}%</li>;
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Scrollable list */}
                          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--geo-border-light)', borderRadius: 6 }}>
                            {versions.map((v, i) => {
                              const vts = new Date(v.saved_at);
                              const vlabel = isNaN(vts.getTime()) ? v.saved_at : vts.toLocaleString();
                              return (
                                <div
                                  key={i}
                                  onClick={() => setVersionIdx(i)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: i === versionIdx ? 'var(--geo-sand)' : 'transparent', borderBottom: i < versions.length - 1 ? '1px solid var(--geo-border-light)' : 'none' }}
                                >
                                  <span style={{ fontSize: 11, color: 'var(--geo-text-muted)', minWidth: 28, flexShrink: 0 }}>{i + 1}</span>
                                  <span style={{ fontSize: 12, flex: 1, color: 'var(--geo-text-primary)' }}>{vlabel}</span>
                                  {v.version != null && <span style={{ fontSize: 10, background: 'var(--geo-border-light)', borderRadius: 6, padding: '1px 5px', flexShrink: 0 }}>v{v.version}</span>}
                                  {v.saved_by && <span style={{ fontSize: 11, color: 'var(--geo-text-muted)', flexShrink: 0 }}>{v.saved_by}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </MasterDetail>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComponentSchemasPage
// ---------------------------------------------------------------------------
const EMPTY_PROP_FORM = { key: '', label: '', type: 'text', required: false, unit: '', min: '', max: '', scale_max: '5', options: [], newOption: '' };

function ComponentSchemasPage({ isActive }) {
  const [schemas, setSchemas]         = React.useState([]);
  const [selected, setSelected]       = React.useState(null); // null | schema object
  const [form, setForm]               = React.useState(null); // null = no editor open
  const [addPropForm, setAddPropForm] = React.useState(null);
  const [saving, setSaving]           = React.useState(false);

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  async function load() {
    try { setSchemas(await apiFetch('/component-schemas/')); }
    catch (e) { alert(e.message); }
  }

  function startNew() {
    setSelected(null);
    setForm({ name: '', description: '', properties: [] });
    setAddPropForm(null);
  }

  function startEdit(schema) {
    setSelected(schema);
    setForm({ ...schema, properties: schema.properties.map(p => ({ ...p })) });
    setAddPropForm(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('Schema name is required.'); return; }
    setSaving(true);
    try {
      let result;
      if (selected) {
        result = await apiFetch(`/component-schemas/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setSchemas(prev => prev.map(s => s.id === result.id ? result : s).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        result = await apiFetch('/component-schemas/', { method: 'POST', body: JSON.stringify(form) });
        setSchemas(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setSelected(result);
      setForm({ ...result, properties: result.properties.map(p => ({ ...p })) });
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete schema "${selected.name}"?`)) return;
    try {
      await apiFetch(`/component-schemas/${selected.id}`, { method: 'DELETE' });
      setSchemas(prev => prev.filter(s => s.id !== selected.id));
      setSelected(null);
      setForm(null);
    } catch (e) { alert(e.message); }
  }

  function confirmAddProp() {
    if (!addPropForm.label.trim()) { alert('Label is required.'); return; }
    const autoKey = addPropForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const key = addPropForm.key.trim() || autoKey;
    if (form.properties.some(p => p.key === key)) { alert(`Key "${key}" already exists.`); return; }
    const prop = { key, label: addPropForm.label.trim(), type: addPropForm.type, required: addPropForm.required };
    if (addPropForm.type === 'number') {
      if (addPropForm.unit)  prop.unit = addPropForm.unit;
      if (addPropForm.min !== '') prop.min = parseFloat(addPropForm.min);
      if (addPropForm.max !== '') prop.max = parseFloat(addPropForm.max);
    }
    if (addPropForm.type === 'scale') prop.scale_max = parseInt(addPropForm.scale_max) || 5;
    if (addPropForm.type === 'select' || addPropForm.type === 'multiselect') prop.options = addPropForm.options;
    setForm(f => ({ ...f, properties: [...f.properties, prop] }));
    setAddPropForm(null);
  }

  return (
    <div className="geo-container layout-sidebar">

      {/* Left: schema list */}
      <div className="geo-card" style={{ alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Schemas</h2>
          <button className="geo-btn" onClick={startNew}>+ New</button>
        </div>
        {schemas.length === 0
          ? <p className="empty">No schemas yet.</p>
          : schemas.map(s => (
            <div key={s.id} onClick={() => startEdit(s)} style={{
              padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
              background: selected?.id === s.id ? 'var(--geo-sand)' : 'transparent',
              border: '1px solid ' + (selected?.id === s.id ? 'var(--geo-border-light)' : 'transparent'),
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.name}
                {s.is_default && <span style={{ fontSize: 10, background: 'rgba(59,78,61,0.15)', color: 'var(--geo-forest)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>default</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 2 }}>
                {s.properties?.length || 0} {s.properties?.length === 1 ? 'property' : 'properties'}
              </div>
            </div>
          ))
        }
      </div>

      {/* Right: editor */}
      {form ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info card */}
          <div className="geo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selected ? 'Edit Schema' : 'New Schema'}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {selected && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
                {selected && (
                  selected.is_default
                    ? <button className="btn btn-secondary" onClick={async () => {
                        await apiFetch('/component-schemas/default', { method: 'DELETE' });
                        setSchemas(prev => prev.map(s => ({ ...s, is_default: false })));
                        setSelected(s => ({ ...s, is_default: false }));
                      }}>★ Remove Default</button>
                    : <button className="btn btn-secondary" onClick={async () => {
                        await apiFetch(`/component-schemas/set-default/${selected.id}`, { method: 'POST' });
                        setSchemas(prev => prev.map(s => ({ ...s, is_default: s.id === selected.id })));
                        setSelected(s => ({ ...s, is_default: true }));
                      }}>☆ Set as Default</button>
                )}
                <button className="geo-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label>Schema Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Resin Certificate" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
            </div>
          </div>

          {/* Properties card */}
          <div className="geo-card">
            <h2 style={{ marginBottom: 12 }}>Properties</h2>

            {form.properties.length === 0 && !addPropForm && (
              <p className="empty" style={{ marginBottom: 12 }}>No properties yet.</p>
            )}

            {form.properties.map((prop, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--geo-sand)', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{prop.label}</span>
                  {prop.required && <span style={{ fontSize: 10, color: '#b84a3a', marginLeft: 6, fontWeight: 700, textTransform: 'uppercase' }}>required</span>}
                  <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 2 }}>
                    <code>{prop.key}</code> · {prop.type}
                    {prop.unit ? ` · ${prop.unit}` : ''}
                    {prop.scale_max ? ` · 1–${prop.scale_max}` : ''}
                    {prop.options?.length ? ` · ${prop.options.join(', ')}` : ''}
                    {prop.min != null ? ` · min ${prop.min}` : ''}
                    {prop.max != null ? ` · max ${prop.max}` : ''}
                  </div>
                </div>
                <button className="btn btn-danger"
                  onClick={() => setForm(f => ({ ...f, properties: f.properties.filter((_, i) => i !== idx) }))}
                  style={{ fontSize: 11, padding: '3px 10px' }}>Remove</button>
              </div>
            ))}

            {addPropForm ? (
              <div style={{ background: 'var(--geo-sand)', borderRadius: 8, padding: 14, marginTop: 8 }}>
                <div className="meta-label" style={{ marginBottom: 10 }}>New Property</div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Label *</label>
                    <input value={addPropForm.label} onChange={e => {
                      const label = e.target.value;
                      const autoKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                      const prevKey = addPropForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                      setAddPropForm(f => ({ ...f, label, key: f.key === '' || f.key === prevKey ? autoKey : f.key }));
                    }} placeholder="e.g. Lot Number" />
                  </div>
                  <div className="form-group">
                    <label>Key <span style={{ fontWeight: 400, color: 'var(--geo-text-muted)' }}>(auto)</span></label>
                    <input value={addPropForm.key} readOnly
                      style={{ background: 'var(--geo-bg)', color: 'var(--geo-text-muted)', cursor: 'default' }} />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={addPropForm.type} onChange={e => setAddPropForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="scale">Scale (1–N)</option>
                      <option value="boolean">Pass / Fail</option>
                      <option value="select">Select (single)</option>
                      <option value="multiselect">Select (multi)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                      <input type="checkbox" checked={addPropForm.required}
                        onChange={e => setAddPropForm(f => ({ ...f, required: e.target.checked }))}
                        style={{ width: 'auto' }} />
                      Required field
                    </label>
                  </div>
                </div>

                {addPropForm.type === 'number' && (
                  <div className="form-row cols-3">
                    <div className="form-group">
                      <label>Unit label</label>
                      <input value={addPropForm.unit} placeholder="kg, mm, …"
                        onChange={e => setAddPropForm(f => ({ ...f, unit: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Min</label>
                      <input type="number" value={addPropForm.min}
                        onChange={e => setAddPropForm(f => ({ ...f, min: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Max</label>
                      <input type="number" value={addPropForm.max}
                        onChange={e => setAddPropForm(f => ({ ...f, max: e.target.value }))} />
                    </div>
                  </div>
                )}
                {addPropForm.type === 'scale' && (
                  <div className="form-row cols-3">
                    <div className="form-group">
                      <label>Scale max</label>
                      <input type="number" min="2" max="10" value={addPropForm.scale_max}
                        onChange={e => setAddPropForm(f => ({ ...f, scale_max: e.target.value }))} />
                    </div>
                  </div>
                )}
                {(addPropForm.type === 'select' || addPropForm.type === 'multiselect') && (
                  <div className="form-group">
                    <label>Options</label>
                    {addPropForm.options.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {addPropForm.options.map(opt => (
                          <span key={opt} style={{ background: 'var(--geo-bg)', border: '1px solid var(--geo-border-light)', borderRadius: 99, padding: '2px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {opt}
                            <button type="button" onClick={() => setAddPropForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={addPropForm.newOption} placeholder="Type an option and press Enter"
                        onChange={e => setAddPropForm(f => ({ ...f, newOption: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && addPropForm.newOption.trim()) {
                            e.preventDefault();
                            setAddPropForm(f => ({ ...f, options: [...f.options, f.newOption.trim()], newOption: '' }));
                          }
                        }}
                        style={{ flex: 1 }} />
                      <button type="button" className="geo-btn-outline"
                        onClick={() => { if (addPropForm.newOption.trim()) setAddPropForm(f => ({ ...f, options: [...f.options, f.newOption.trim()], newOption: '' })); }}>
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="geo-btn" onClick={confirmAddProp}>Add Property</button>
                  <button className="geo-btn-outline" onClick={() => setAddPropForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="geo-btn-outline" style={{ marginTop: 4 }}
                onClick={() => setAddPropForm({ ...EMPTY_PROP_FORM })}>
                + Add Property
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, color: 'var(--geo-text-muted)', fontSize: 13 }}>
          Select a schema to edit, or create a new one.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MaterialSchemasPage
// ---------------------------------------------------------------------------
function MaterialSchemasPage({ isActive }) {
  const [schemas, setSchemas]         = React.useState([]);
  const [selected, setSelected]       = React.useState(null);
  const [form, setForm]               = React.useState(null);
  const [addPropForm, setAddPropForm] = React.useState(null);
  const [saving, setSaving]           = React.useState(false);

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  async function load() {
    try { setSchemas(await apiFetch('/material-schemas/')); }
    catch (e) { alert(e.message); }
  }

  function startNew() {
    setSelected(null);
    setForm({ name: '', description: '', properties: [] });
    setAddPropForm(null);
  }

  function startEdit(schema) {
    setSelected(schema);
    setForm({ ...schema, properties: schema.properties.map(p => ({ ...p })) });
    setAddPropForm(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('Schema name is required.'); return; }
    setSaving(true);
    try {
      let result;
      if (selected) {
        result = await apiFetch(`/material-schemas/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setSchemas(prev => prev.map(s => s.id === result.id ? result : s).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        result = await apiFetch('/material-schemas/', { method: 'POST', body: JSON.stringify(form) });
        setSchemas(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setSelected(result);
      setForm({ ...result, properties: result.properties.map(p => ({ ...p })) });
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete schema "${selected.name}"?`)) return;
    try {
      await apiFetch(`/material-schemas/${selected.id}`, { method: 'DELETE' });
      setSchemas(prev => prev.filter(s => s.id !== selected.id));
      setSelected(null);
      setForm(null);
    } catch (e) { alert(e.message); }
  }

  function confirmAddProp() {
    if (!addPropForm.label.trim()) { alert('Label is required.'); return; }
    const autoKey = addPropForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const key = addPropForm.key.trim() || autoKey;
    if (form.properties.some(p => p.key === key)) { alert(`Key "${key}" already exists.`); return; }
    const prop = { key, label: addPropForm.label.trim(), type: addPropForm.type, required: addPropForm.required };
    if (addPropForm.type === 'number') {
      if (addPropForm.unit)  prop.unit = addPropForm.unit;
      if (addPropForm.min !== '') prop.min = parseFloat(addPropForm.min);
      if (addPropForm.max !== '') prop.max = parseFloat(addPropForm.max);
    }
    if (addPropForm.type === 'scale') prop.scale_max = parseInt(addPropForm.scale_max) || 5;
    if (addPropForm.type === 'select' || addPropForm.type === 'multiselect') prop.options = addPropForm.options;
    setForm(f => ({ ...f, properties: [...f.properties, prop] }));
    setAddPropForm(null);
  }

  return (
    <div className="geo-container layout-sidebar">
      <div className="geo-card" style={{ alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Schemas</h2>
          <button className="geo-btn" onClick={startNew}>+ New</button>
        </div>
        {schemas.length === 0
          ? <p className="empty">No schemas yet.</p>
          : schemas.map(s => (
            <div key={s.id} onClick={() => startEdit(s)} style={{
              padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
              background: selected?.id === s.id ? 'var(--geo-sand)' : 'transparent',
              border: '1px solid ' + (selected?.id === s.id ? 'var(--geo-border-light)' : 'transparent'),
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.name}
                {s.is_default && <span style={{ fontSize: 10, background: 'rgba(59,78,61,0.15)', color: 'var(--geo-forest)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>default</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 2 }}>
                {s.properties?.length || 0} {s.properties?.length === 1 ? 'property' : 'properties'}
              </div>
            </div>
          ))
        }
      </div>

      {form ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="geo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selected ? 'Edit Schema' : 'New Schema'}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {selected && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
                {selected && (
                  selected.is_default
                    ? <button className="btn btn-secondary" onClick={async () => {
                        await apiFetch('/material-schemas/default', { method: 'DELETE' });
                        setSchemas(prev => prev.map(s => ({ ...s, is_default: false })));
                        setSelected(s => ({ ...s, is_default: false }));
                      }}>★ Remove Default</button>
                    : <button className="btn btn-secondary" onClick={async () => {
                        await apiFetch(`/material-schemas/set-default/${selected.id}`, { method: 'POST' });
                        setSchemas(prev => prev.map(s => ({ ...s, is_default: s.id === selected.id })));
                        setSelected(s => ({ ...s, is_default: true }));
                      }}>☆ Set as Default</button>
                )}
                <button className="geo-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label>Schema Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mix Cert" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
            </div>
          </div>

          <div className="geo-card">
            <h2 style={{ marginBottom: 12 }}>Properties</h2>
            {form.properties.length === 0 && !addPropForm && (
              <p className="empty" style={{ marginBottom: 12 }}>No properties yet.</p>
            )}
            {form.properties.map((prop, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--geo-sand)', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{prop.label}</span>
                  {prop.required && <span style={{ fontSize: 10, color: '#b84a3a', marginLeft: 6, fontWeight: 700, textTransform: 'uppercase' }}>required</span>}
                  <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 2 }}>
                    <code>{prop.key}</code> · {prop.type}
                    {prop.unit ? ` · ${prop.unit}` : ''}
                    {prop.scale_max ? ` · 1–${prop.scale_max}` : ''}
                    {prop.options?.length ? ` · ${prop.options.join(', ')}` : ''}
                    {prop.min != null ? ` · min ${prop.min}` : ''}
                    {prop.max != null ? ` · max ${prop.max}` : ''}
                  </div>
                </div>
                <button className="btn btn-danger"
                  onClick={() => setForm(f => ({ ...f, properties: f.properties.filter((_, i) => i !== idx) }))}
                  style={{ fontSize: 11, padding: '3px 10px' }}>Remove</button>
              </div>
            ))}

            {addPropForm ? (
              <div style={{ background: 'var(--geo-sand)', borderRadius: 8, padding: 14, marginTop: 8 }}>
                <div className="meta-label" style={{ marginBottom: 10 }}>New Property</div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Label *</label>
                    <input value={addPropForm.label} onChange={e => {
                      const label = e.target.value;
                      const autoKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                      const prevKey = addPropForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                      setAddPropForm(f => ({ ...f, label, key: f.key === '' || f.key === prevKey ? autoKey : f.key }));
                    }} placeholder="e.g. Batch Number" />
                  </div>
                  <div className="form-group">
                    <label>Key <span style={{ fontWeight: 400, color: 'var(--geo-text-muted)' }}>(auto)</span></label>
                    <input value={addPropForm.key} readOnly
                      style={{ background: 'var(--geo-bg)', color: 'var(--geo-text-muted)', cursor: 'default' }} />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={addPropForm.type} onChange={e => setAddPropForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="scale">Scale (1–N)</option>
                      <option value="boolean">Pass / Fail</option>
                      <option value="select">Select (single)</option>
                      <option value="multiselect">Select (multi)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                      <input type="checkbox" checked={addPropForm.required}
                        onChange={e => setAddPropForm(f => ({ ...f, required: e.target.checked }))}
                        style={{ width: 'auto' }} />
                      Required field
                    </label>
                  </div>
                </div>
                {addPropForm.type === 'number' && (
                  <div className="form-row cols-3">
                    <div className="form-group">
                      <label>Unit label</label>
                      <input value={addPropForm.unit} placeholder="kg, mm, …"
                        onChange={e => setAddPropForm(f => ({ ...f, unit: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Min</label>
                      <input type="number" value={addPropForm.min}
                        onChange={e => setAddPropForm(f => ({ ...f, min: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Max</label>
                      <input type="number" value={addPropForm.max}
                        onChange={e => setAddPropForm(f => ({ ...f, max: e.target.value }))} />
                    </div>
                  </div>
                )}
                {addPropForm.type === 'scale' && (
                  <div className="form-row cols-3">
                    <div className="form-group">
                      <label>Scale max</label>
                      <input type="number" min="2" max="10" value={addPropForm.scale_max}
                        onChange={e => setAddPropForm(f => ({ ...f, scale_max: e.target.value }))} />
                    </div>
                  </div>
                )}
                {(addPropForm.type === 'select' || addPropForm.type === 'multiselect') && (
                  <div className="form-group">
                    <label>Options</label>
                    {addPropForm.options.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {addPropForm.options.map(opt => (
                          <span key={opt} style={{ background: 'var(--geo-bg)', border: '1px solid var(--geo-border-light)', borderRadius: 99, padding: '2px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {opt}
                            <button type="button" onClick={() => setAddPropForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={addPropForm.newOption} placeholder="Type an option and press Enter"
                        onChange={e => setAddPropForm(f => ({ ...f, newOption: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && addPropForm.newOption.trim()) {
                            e.preventDefault();
                            setAddPropForm(f => ({ ...f, options: [...f.options, f.newOption.trim()], newOption: '' }));
                          }
                        }}
                        style={{ flex: 1 }} />
                      <button type="button" className="geo-btn-outline"
                        onClick={() => { if (addPropForm.newOption.trim()) setAddPropForm(f => ({ ...f, options: [...f.options, f.newOption.trim()], newOption: '' })); }}>
                        Add
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="geo-btn" onClick={confirmAddProp}>Add Property</button>
                  <button className="geo-btn-outline" onClick={() => setAddPropForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="geo-btn-outline" style={{ marginTop: 4 }}
                onClick={() => setAddPropForm({ ...EMPTY_PROP_FORM })}>
                + Add Property
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, color: 'var(--geo-text-muted)', fontSize: 13 }}>
          Select a schema to edit, or create a new one.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HelpDrawer
// ---------------------------------------------------------------------------
function HelpDrawer({ page, onClose }) {
  const tab = TABS.find(t => t.id === page);
  if (!tab) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
      <div className="help-drawer">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--geo-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--geo-white)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--geo-text-muted)', marginBottom: 2 }}>User Manual</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--geo-forest)' }}>{tab.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--geo-text-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--geo-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>{tab.desc}</p>
          {(tab.help || []).map(section => (
            <div key={section.heading} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--geo-forest)', marginBottom: 8 }}>{section.heading}</div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--geo-text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [page, setPage] = React.useState(() => {
    const hash = window.location.hash.replace('#/', '');
    return TABS.find(t => t.id === hash) ? hash : TABS[0].id;
  });
  const [user, setUser] = React.useState(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const componentsDirtyRef = React.useRef(false);
  const materialsDirtyRef  = React.useRef(false);

  React.useEffect(() => {
    apiFetch('/me').then(setUser).catch(() => {});
  }, []);

  React.useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#/', '');
      if (TABS.find(t => t.id === hash)) setPage(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(id) {
    if (id !== page && (componentsDirtyRef.current || materialsDirtyRef.current)) {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) return;
    }
    window.location.hash = '/' + id;
    setPage(id);
    setHelpOpen(false);
  }

  return (
    <div>
      {/* Fixed header: rainbow + nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#ff6b6b,#ffa94d,#ffd43b,#69db7c,#4dabf7,#9775fa,#f06595)' }} />
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 2rem', background: '#505951', borderBottom: '1px solid #3b4e3d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a href="http://10.0.1.11/brigade" style={{ color: '#8a9a8a', textDecoration: 'none', fontSize: '0.85rem' }}>← The Kitchen</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user && user.name && <>
              <span style={{ fontSize: '0.85rem', color: '#899a8a' }}>{user.name}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, background: 'rgba(137,154,138,0.2)', color: '#899a8a', padding: '0.2rem 0.55rem', borderRadius: 6, border: '1px solid rgba(137,154,138,0.3)', textTransform: 'capitalize' }}>{user.role}</span>
              {user.role === 'admin' && <>
                <a href="http://10.0.1.11/maitred/admin" style={{ color: '#8a9a8a', textDecoration: 'none', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Users</a>
                <a href="http://10.0.1.11/brigade/health/dashboard" style={{ color: '#8a9a8a', textDecoration: 'none', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Health</a>
              </>}
              <a href="http://10.0.1.11/maitred/profile" style={{ color: '#8a9a8a', textDecoration: 'none', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Profile</a>
              <a href="http://10.0.1.11/maitred/logout" style={{ color: '#8a9a8a', textDecoration: 'none', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Sign Out</a>
            </>}
          </div>
        </header>
      </div>
      <div style={{ height: 52 }} />

      {/* App title + tab bar */}
      <div className="geo-container" style={{ paddingTop: '2rem' }}>
        <div className="geo-page-header">
          <h1>🧱 Larder</h1>
          <p>Material component and recipe manager</p>
        </div>
        <nav className="app-tab-bar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => navigate(t.id)} className={page === t.id ? 'app-tab active' : 'app-tab'}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {TABS.map(t => (
        <div key={t.id} style={{ display: page === t.id ? '' : 'none' }}>
          {t.id === 'components'        && <ComponentsPage       isActive={page === 'components'}        dirtyRef={componentsDirtyRef} />}
          {t.id === 'component-schemas' && <ComponentSchemasPage isActive={page === 'component-schemas'} />}
          {t.id === 'materials'         && <MaterialsPage        isActive={page === 'materials'}         dirtyRef={materialsDirtyRef} />}
          {t.id === 'material-schemas'  && <MaterialSchemasPage  isActive={page === 'material-schemas'} />}
        </div>
      ))}

      {helpOpen && <HelpDrawer page={page} onClose={() => setHelpOpen(false)} />}

      <button
        onClick={() => setHelpOpen(true)}
        title="User Manual"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--geo-forest)', color: 'var(--geo-ceramic)',
          border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 150,
        }}
      >?</button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
