import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { AREAS, IVA_OPTIONS, STORAGE } from '../../lib/labels.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

const EMPTY = {
  area: 'drogueria', name: '', sku: '', barcode: '', brand: '', category: '', presentation: '', unit: '',
  activeIngredient: '', concentration: '', pharmaceuticalForm: '', invimaRegistry: '',
  requiresPrescription: false, isControlled: false, storageCondition: 'ambient',
  costPrice: '', salePrice: '', ivaRate: 0, minStock: '0', maxStock: '', location: '',
};
const TEXT = ['name', 'sku', 'barcode', 'brand', 'category', 'presentation', 'unit', 'activeIngredient', 'concentration', 'pharmaceuticalForm', 'invimaRegistry', 'location'];

const fromProduct = (product) => ({
  ...EMPTY,
  ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, product[key] ?? EMPTY[key]])),
  costPrice: String(product.costPrice ?? ''),
  salePrice: String(product.salePrice ?? ''),
  minStock: String(product.minStock ?? 0),
  maxStock: product.maxStock ? String(product.maxStock) : '',
});

function Check({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl bg-black/[0.03] px-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 rounded accent-[rgb(var(--brand-600))]" />
      <span>
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-mute">{hint}</span>}
      </span>
    </label>
  );
}

export function ProductForm({ open, product, onClose }) {
  const editing = Boolean(product);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/products/categories'), enabled: open, staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    if (open) {
      setForm(product ? fromProduct(product) : EMPTY);
      setErrors({});
      setFormError('');
    }
  }, [open, product]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setValue = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const isPharmacy = form.area === 'drogueria';

  const save = useMutation({
    mutationFn: (body) => (editing ? api.patch(`/products/${product.id}`, body) : api.post('/products', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      onClose();
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    },
  });

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    const body = {
      salePrice: Number(form.salePrice),
      costPrice: Number(form.costPrice || 0),
      ivaRate: Number(form.ivaRate),
      minStock: Number(form.minStock || 0),
      storageCondition: form.storageCondition,
    };
    if (form.maxStock !== '') body.maxStock = Number(form.maxStock);
    for (const key of TEXT) {
      const value = form[key].trim();
      // Al crear, los vacíos no se envían; al editar se envían para poder borrar un dato
      if (value || editing) body[key] = value;
    }
    if (isPharmacy) {
      body.requiresPrescription = form.requiresPrescription;
      body.isControlled = form.isControlled;
    }
    if (!editing) body.area = form.area;
    save.mutate(body);
  };

  const err = (field) => errors[field];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      description={editing ? undefined : 'El stock se carga después con una compra o con el inventario inicial.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="product-form" loading={save.isPending} disabled={!form.name.trim() || !form.salePrice}>
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}

        {!editing && (
          <Select label="Área" value={form.area} onChange={set('area')}>
            {Object.entries(AREAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        )}
        <Input label="Nombre" data-autofocus value={form.name} onChange={set('name')} error={err('name')} required />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Código de barras" value={form.barcode} onChange={set('barcode')} error={err('barcode')} inputMode="numeric" />
          <Input label="SKU / referencia" value={form.sku} onChange={set('sku')} error={err('sku')} />
          <Input label="Marca" value={form.brand} onChange={set('brand')} error={err('brand')} />
          <div>
            <Input label="Categoría" list="categorias" value={form.category} onChange={set('category')} error={err('category')} />
            <datalist id="categorias">{(categories?.data.categories ?? []).map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <Input label="Presentación" placeholder="Caja x 20 tabletas" value={form.presentation} onChange={set('presentation')} error={err('presentation')} />
          <Input label="Unidad" placeholder="caja, frasco, metro…" value={form.unit} onChange={set('unit')} error={err('unit')} />
        </div>

        {isPharmacy && (
          <fieldset className="space-y-4 rounded-2xl bg-black/[0.03] p-4">
            <legend className="px-1 text-sm font-semibold text-ink-soft">Datos farmacéuticos</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Principio activo" value={form.activeIngredient} onChange={set('activeIngredient')} error={err('activeIngredient')} />
              <Input label="Concentración" placeholder="500 mg" value={form.concentration} onChange={set('concentration')} error={err('concentration')} />
              <Input label="Forma farmacéutica" placeholder="Tableta" value={form.pharmaceuticalForm} onChange={set('pharmaceuticalForm')} error={err('pharmaceuticalForm')} />
              <Input label="Registro INVIMA" value={form.invimaRegistry} onChange={set('invimaRegistry')} error={err('invimaRegistry')} />
              <Select label="Almacenamiento" value={form.storageCondition} onChange={set('storageCondition')}>
                {Object.entries(STORAGE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </div>
            <Check label="Requiere fórmula médica" hint="Al vender se pedirán los datos de la fórmula." checked={form.requiresPrescription || form.isControlled} disabled={form.isControlled} onChange={setValue('requiresPrescription')} />
            <Check label="Medicamento de control especial" hint="Solo lo puede vender el regente o el administrador." checked={form.isControlled} onChange={setValue('isControlled')} />
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Precio de venta" hint="Con IVA incluido" inputMode="decimal" value={form.salePrice} onChange={set('salePrice')} error={err('salePrice')} required />
          <Input label="Costo" hint="Sin IVA" inputMode="decimal" value={form.costPrice} onChange={set('costPrice')} error={err('costPrice')} />
          <Select label="IVA" value={form.ivaRate} onChange={set('ivaRate')} error={err('ivaRate')}>
            {IVA_OPTIONS.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
          </Select>
          <Input label="Stock mínimo" hint="Avisa cuando llegue a esta cantidad" inputMode="numeric" value={form.minStock} onChange={set('minStock')} error={err('minStock')} />
          <Input label="Stock máximo" inputMode="numeric" value={form.maxStock} onChange={set('maxStock')} error={err('maxStock')} />
          <Input label="Ubicación" placeholder="Estante A2" value={form.location} onChange={set('location')} error={err('location')} />
        </div>
      </form>
    </Modal>
  );
}
