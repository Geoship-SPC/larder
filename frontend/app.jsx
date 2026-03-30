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
];

// ---------------------------------------------------------------------------
// MasterDetail
// ---------------------------------------------------------------------------
function MasterDetail({ title, items, selectedId, onSelect, onNew, renderItem, emptyMsg, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
      <div className="geo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--geo-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--geo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
          <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onNew}>+ New</button>
        </div>
        {items.length === 0 && <div className="empty" style={{ fontSize: 12, padding: '16px' }}>No items yet.</div>}
        {items.map(item => (
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
// ComponentsPage
// ---------------------------------------------------------------------------
function ComponentsPage({ isActive }) {
  const [components, setComponents] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null); // null | 'new' | number
  const [form, setForm] = React.useState({ name: '', description: '' });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const selected = selectedId === 'new' ? 'new' : (components.find(c => c.id === selectedId) || null);

  async function load() {
    const data = await apiFetch('/components/');
    setComponents(data);
  }

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  function selectComponent(c) {
    setSelectedId(c.id);
    setForm({ name: c.name, description: c.description || '' });
    setError(null);
  }

  function newComponent() {
    setSelectedId('new');
    setForm({ name: '', description: '' });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null };
      if (selectedId === 'new') {
        const created = await apiFetch('/components/', { method: 'POST', body: JSON.stringify(payload) });
        await load();
        setSelectedId(created.id);
        setForm({ name: created.name, description: created.description || '' });
      } else {
        await apiFetch(`/components/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
        await load();
      }
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function deleteComponent() {
    if (!confirm(`Delete component "${selected.name}"?`)) return;
    try {
      await apiFetch(`/components/${selectedId}`, { method: 'DELETE' });
      await load();
      setSelectedId(null);
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
        items={components}
        selectedId={selectedId !== 'new' ? selectedId : null}
        onSelect={selectComponent}
        onNew={newComponent}
        renderItem={c => (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--geo-text-primary)' }}>{c.name}</div>
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
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--geo-forest)' }}>
              {selected === 'new' ? 'New Component' : `Edit — ${selected.name}`}
            </h3>
            {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="geo-input"
                placeholder="e.g. Portland Cement"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="geo-input"
                rows={3}
                placeholder="Optional description or notes"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setSelectedId(null); setError(null); }} className="btn btn-secondary">Cancel</button>
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
function MaterialsPage({ isActive }) {
  const [materials, setMaterials] = React.useState([]);
  const [allComponents, setAllComponents] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [form, setForm] = React.useState({ name: '', description: '', density: '', components: [] });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [volume, setVolume] = React.useState('');
  const [volUnit, setVolUnit] = React.useState('gal');

  const selected = selectedId === 'new' ? 'new' : (materials.find(m => m.id === selectedId) || null);

  async function load() {
    const [mats, comps] = await Promise.all([apiFetch('/materials/'), apiFetch('/components/')]);
    setMaterials(mats);
    setAllComponents(comps);
  }

  React.useEffect(() => { if (isActive) load(); }, [isActive]);

  function selectMaterial(m) {
    setSelectedId(m.id);
    setForm({
      name: m.name,
      description: m.description || '',
      density: m.density != null ? String(m.density) : '',
      components: (m.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio) })),
    });
    setError(null);
    setVolume('');
  }

  function newMaterial() {
    setSelectedId('new');
    setForm({ name: '', description: '', density: '', components: [] });
    setError(null);
    setVolume('');
  }

  function addComponentEntry() {
    setForm(f => ({ ...f, components: [...f.components, { component_id: '', ratio: '' }] }));
  }

  function removeComponentEntry(idx) {
    setForm(f => ({ ...f, components: f.components.filter((_, i) => i !== idx) }));
  }

  function updateEntry(idx, field, value) {
    setForm(f => {
      const comps = [...f.components];
      comps[idx] = { ...comps[idx], [field]: value };
      return { ...f, components: comps };
    });
  }

  const ratioTotal = form.components.reduce((sum, c) => sum + (parseFloat(c.ratio) || 0), 0);
  const ratioValid = form.components.length === 0 || Math.abs(ratioTotal - 100) < 0.01;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        density:     form.density !== '' ? parseFloat(form.density) : null,
        components:  form.components.map(c => ({
          component_id: parseInt(c.component_id),
          ratio:        parseFloat(c.ratio),
        })),
      };
      if (selectedId === 'new') {
        const created = await apiFetch('/materials/', { method: 'POST', body: JSON.stringify(payload) });
        await load();
        setSelectedId(created.id);
        setForm({
          name: created.name, description: created.description || '',
          density: created.density != null ? String(created.density) : '',
          components: (created.components || []).map(c => ({ component_id: String(c.component_id), ratio: String(c.ratio) })),
        });
      } else {
        await apiFetch(`/materials/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
        await load();
      }
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function deleteMaterial() {
    if (!confirm(`Delete material "${selected.name}"?`)) return;
    try {
      await apiFetch(`/materials/${selectedId}`, { method: 'DELETE' });
      await load();
      setSelectedId(null);
    } catch (e) { alert(e.message); }
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

  return (
    <div className="geo-container" style={{ paddingTop: '1rem' }}>
      <MasterDetail
        title="Materials"
        items={materials}
        selectedId={selectedId !== 'new' ? selectedId : null}
        onSelect={selectMaterial}
        onNew={newMaterial}
        renderItem={m => (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--geo-text-primary)' }}>{m.name}</div>
            <div style={{ fontSize: 11, color: 'var(--geo-text-muted)', marginTop: 1 }}>
              {m.density != null ? `${m.density} g/mL` : 'No density'}
              {' · '}
              {(m.components || []).length} component{(m.components || []).length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        emptyMsg="Select a material or create a new one."
      >
        {selected && (
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--geo-forest)' }}>
              {selected === 'new' ? 'New Material' : `Edit — ${selected.name}`}
            </h3>
            {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="form-row cols-2" style={{ marginBottom: 4 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="geo-input" placeholder="e.g. Fiber Mix A" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="geo-input" rows={2} placeholder="Optional notes" />
              </div>
              <div className="form-group">
                <label>Density (g/mL)</label>
                <input type="number" step="0.001" min="0" value={form.density} onChange={e => setForm({ ...form, density: e.target.value })} className="geo-input" placeholder="e.g. 1.5" />
              </div>
            </div>

            <div className="geo-section-label" style={{ marginTop: 8 }}>Components</div>
            {form.components.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--geo-text-muted)', fontStyle: 'italic', padding: '6px 0 10px' }}>
                No components added yet.
              </div>
            )}
            {form.components.map((entry, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <select value={entry.component_id} onChange={e => updateEntry(idx, 'component_id', e.target.value)} className="geo-input">
                  <option value="">— Select component —</option>
                  {allComponents.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
                <button
                  onClick={() => removeComponentEntry(idx)}
                  style={{ background: 'none', border: '1px solid var(--geo-border-light)', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: 'var(--geo-text-muted)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ))}

            {form.components.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: ratioValid ? '#27ae60' : '#b84a3a' }}>
                Total: {ratioTotal.toFixed(2)}%{ratioValid ? ' ✓' : ' — must equal 100%'}
              </div>
            )}

            <button onClick={addComponentEntry} className="btn btn-secondary" style={{ fontSize: 12, marginBottom: 20 }}>
              + Add Component
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setSelectedId(null); setError(null); }} className="btn btn-secondary">Cancel</button>
              {selected !== 'new' && (
                <button onClick={deleteMaterial} className="btn btn-danger" style={{ marginLeft: 'auto' }}>Delete</button>
              )}
            </div>

            {/* Volume Calculator */}
            {savedMat && savedMat.density != null && (savedMat.components || []).length > 0 && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--geo-border-light)' }}>
                <div className="geo-section-label" style={{ marginTop: 0 }}>Volume Calculator</div>
                <p style={{ fontSize: 12, color: 'var(--geo-text-muted)', marginBottom: 14 }}>
                  Enter a volume to compute the required mass of each component.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input
                    type="number" min="0" step="any"
                    value={volume}
                    onChange={e => setVolume(e.target.value)}
                    className="geo-input"
                    placeholder="0"
                    style={{ width: 120 }}
                  />
                  <select
                    value={volUnit}
                    onChange={e => setVolUnit(e.target.value)}
                    className="geo-input"
                    style={{ width: 70 }}
                  >
                    <option value="gal">gal</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                  </select>
                  <span style={{ fontSize: 12, color: 'var(--geo-text-muted)' }}>
                    × {savedMat.density} g/mL
                    {totalMass != null && (
                      <> = <strong style={{ color: 'var(--geo-text-primary)' }}>{fmt(totalMass)} g total</strong></>
                    )}
                  </span>
                </div>

                {totalMass != null && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={thS}>Component</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Ratio</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Mass (g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(savedMat.components || []).map((entry, i) => {
                          const comp = allComponents.find(c => c.id === entry.component_id);
                          const mass = totalMass * (entry.ratio / 100);
                          return (
                            <tr key={i}>
                              <td style={tdS}>{comp ? comp.name : `Component #${entry.component_id}`}</td>
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
                          <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, borderTop: '2px solid var(--geo-border-light)' }}>{fmt(totalMass)}</td>
                        </tr>
                      </tfoot>
                    </table>
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
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
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
          {t.id === 'components'        && <ComponentsPage        isActive={page === 'components'} />}
          {t.id === 'component-schemas' && <ComponentSchemasPage  isActive={page === 'component-schemas'} />}
          {t.id === 'materials'         && <MaterialsPage         isActive={page === 'materials'} />}
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
