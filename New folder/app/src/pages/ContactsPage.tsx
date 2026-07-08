import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  FileText,
  User,
  Building2,
  Phone,
  Mail,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Contact } from '../types';
import { bhutanLocations, getAllRegions } from '../data/bhutanLocations';

interface ContactsPageProps {
  type: 'customer' | 'supplier';
}

export function ContactsPage({ type }: ContactsPageProps) {
  const { showNotification } = useAppStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    addressStreet: '',
    addressGewog: '',
    addressDzongkhag: '',
    creditLimit: 50000,
    creditDays: 30,
    openingBalance: 0,
    gstNumber: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContacts();
  }, [type]);

  const loadContacts = async () => {
    try {
      const result = await window.electronSecureAPI.contacts.getAll(type);
      if (result?.success) {
        setContacts(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      showNotification(`Failed to load ${type}s`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const errors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      errors.name = `${type === 'customer' ? 'Customer' : 'Company'} name is required`
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    } else if (formData.name.length > 200) {
      errors.name = 'Name must be under 200 characters'
    }

    // Contact person validation - REQUIRED
    if (!formData.contactPerson.trim()) {
      errors.contactPerson = 'Contact person is required'
    } else if (formData.contactPerson.length > 100) {
      errors.contactPerson = 'Contact person must be under 100 characters'
    }

    // Phone validation - REQUIRED
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^\+?[0-9\s-]{8,20}$/.test(formData.phone)) {
      errors.phone = 'Valid phone required (8-20 digits, e.g. +975 17 123 456)'
    }

    // Email validation - REQUIRED
    if (!formData.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // GST/TPN/CID validation - REQUIRED
    if (!formData.gstNumber.trim()) {
      errors.gstNumber = 'GST/TPN/CID number is required'
    } else if (formData.gstNumber.length > 50) {
      errors.gstNumber = 'GST/TPN/CID must be under 50 characters'
    }

    // Address validation
    if (formData.addressStreet && formData.addressStreet.length > 300) {
      errors.addressStreet = 'Address must be under 300 characters'
    }

    // Credit validation
    if (formData.creditLimit < 0) {
      errors.creditLimit = 'Credit limit cannot be negative'
    }
    if (formData.creditDays < 0 || formData.creditDays > 365) {
      errors.creditDays = 'Credit days must be 0-365'
    }

    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      showNotification('Please fix the errors in the form', 'error')
      return
    }

    try {
      const result = await window.electronSecureAPI.contacts.create({
        type,
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address || null,
        addressStructured: {
          street: formData.addressStreet.trim() || null,
          gewog: formData.addressGewog || null,
          dzongkhag: formData.addressDzongkhag || null,
        },
        creditLimit: formData.creditLimit,
        creditDays: formData.creditDays,
        openingBalance: formData.openingBalance,
        gstNumber: formData.gstNumber.trim(),
      });

      if (result.success) {
        showNotification(`${type === 'customer' ? 'Customer' : 'Supplier'} created successfully`, 'success');
        setShowAddModal(false);
        loadContacts();
        resetForm();
      } else {
        showNotification(result.message || 'Failed to create', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to create', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const result = await window.electronSecureAPI.contacts.delete(id);
      if (result.success) {
        showNotification('Deleted successfully', 'success');
        loadContacts();
      } else {
        showNotification(result.message || 'Failed to delete', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to delete', 'error');
    }
  };

  const viewLedger = async (contact: Contact) => {
    try {
      const result = await window.electronSecureAPI.contacts.getLedger(contact.id);
      if (result?.success) {
        setSelectedContact(contact);
        setLedgerData(result.data);
        setShowLedgerModal(true);
      }
    } catch (error) {
      showNotification('Failed to load ledger', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      addressStreet: '',
      addressGewog: '',
      addressDzongkhag: '',
      creditLimit: 50000,
      creditDays: 30,
      openingBalance: 0,
      gstNumber: '',
    });
    setFormErrors({});
  };

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const icon = type === 'customer' ? User : Building2;
  const Icon = icon;

  return (
    <div className="space-y-6 pb-8">
      {/* Header Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">

        <div className="space-y-1 flex-shrink-0 w-full md:w-auto">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="bg-bhutan-maroon/10 p-2 rounded-xl text-bhutan-maroon">
              <Icon className="w-6 h-6" />
            </div>
            {type === 'customer' ? 'Customers' : 'Suppliers'} Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">Manage your trade network and track ledgers</p>
        </div>

        <div className="flex-1 w-full max-w-2xl flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full group">
            <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-bhutan-maroon/20 focus-within:border-bhutan-maroon transition-all duration-300">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${type}s by name, phone or email...`}
                className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none focus:ring-0 text-slate-700 placeholder:text-slate-400 font-medium h-full rounded-xl text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-bhutan-maroon text-white px-6 py-3 rounded-xl hover:bg-bhutan-maroon-dark hover:shadow-lg hover:shadow-bhutan-maroon/20 transition-all duration-300 active:scale-95 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add {type}
          </button>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-bhutan-maroon/30 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
            {/* Top Accent Line */}
            <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${type === 'customer' ? 'bg-bhutan-gold' : 'bg-bhutan-maroon'}`}></div>

            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 ${type === 'customer'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-purple-50 text-purple-600'
                  }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight text-base group-hover:text-bhutan-maroon transition-colors line-clamp-1">{contact.name}</h3>
                  {contact.contactPerson && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{contact.contactPerson}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => viewLedger(contact)}
                  className="p-1.5 text-bhutan-orange bg-bhutan-orange/10 hover:bg-bhutan-orange hover:text-white rounded-lg transition-colors"
                  title="Statement"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {contact.phone && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Balance</span>
                </div>
                <span className={`text-base font-bold ${contact.currentBalance > 0 ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                  {formatCurrency(Math.abs(contact.currentBalance))}
                  {contact.currentBalance > 0 && (
                    <span className="text-[10px] ml-1 opacity-70 align-top">{type === 'customer' ? 'Dr' : 'Cr'}</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${contact.currentBalance > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (Math.abs(contact.currentBalance) / (contact.creditLimit || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-400 font-medium">
                <span>Limit: {formatCurrency(contact.creditLimit)}</span>
                <span>{contact.creditDays} Days</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
          <div className="inline-flex p-5 rounded-full bg-slate-50 mb-4">
            <Icon className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No {type}s found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {searchQuery ? "We couldn't find any matches for your search." : `Start building your network by adding your first ${type}.`}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 text-bhutan-maroon font-semibold text-sm hover:text-bhutan-maroon-dark transition-colors inline-flex items-center gap-2"
            >
              Add {type} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold truncate text-slate-800">
                    New {type === 'customer' ? 'Customer' : 'Supplier'}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Enter details for the new trade partner</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {type === 'customer' ? 'Name' : 'Company Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name') }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    placeholder={`e.g. Druk Associates`}
                    required
                  />
                  {formErrors.name && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Contact Person *</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => { setFormData({ ...formData, contactPerson: e.target.value }); clearFieldError('contactPerson') }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 ${formErrors.contactPerson ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    placeholder="Full name"
                    required
                  />
                  {formErrors.contactPerson && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.contactPerson}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); clearFieldError('phone') }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    placeholder="+975 17 123 456"
                    required
                  />
                  {formErrors.phone && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email') }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    placeholder="contact@company.com"
                    required
                  />
                  {formErrors.email && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">GST/TPN/CID *</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => { setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() }); clearFieldError('gstNumber') }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 uppercase ${formErrors.gstNumber ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    placeholder="GST/TPN/CID"
                    required
                  />
                  {formErrors.gstNumber && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.gstNumber}</p>}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 mt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Address</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Street / Locality</label>
                    <input
                      type="text"
                      value={formData.addressStreet}
                      onChange={(e) => { setFormData({ ...formData, addressStreet: e.target.value }); clearFieldError('addressStreet') }}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 ${formErrors.addressStreet ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                      placeholder="Street, Building..."
                    />
                    {formErrors.addressStreet && <p className="text-xs text-red-500 font-semibold mt-1">{formErrors.addressStreet}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Dzongkhag</label>
                      <select
                        value={formData.addressDzongkhag}
                        onChange={(e) => setFormData({ ...formData, addressDzongkhag: e.target.value, addressGewog: '' })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800"
                      >
                        <option value="">Select Dzongkhag</option>
                        {getAllRegions().map((region) => (
                          <optgroup key={region} label={region}>
                            {bhutanLocations
                              .filter((dz) => dz.region === region)
                              .map((dz) => (
                                <option key={dz.id} value={dz.id}>{dz.name}</option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Gewog</label>
                      <select
                        value={formData.addressGewog}
                        onChange={(e) => setFormData({ ...formData, addressGewog: e.target.value })}
                        disabled={!formData.addressDzongkhag}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Gewog</option>
                        {formData.addressDzongkhag &&
                          bhutanLocations
                            .find((dz) => dz.id === formData.addressDzongkhag)
                            ?.gewogs.map((gewog) => (
                              <option key={gewog.id} value={gewog.id}>{gewog.name}</option>
                            ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-400" /> Financial Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Credit Limit</label>
                    <input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon font-semibold text-sm"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Credit Days</label>
                    <input
                      type="number"
                      value={formData.creditDays}
                      onChange={(e) => setFormData({ ...formData, creditDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon font-semibold text-sm"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Opening Bal.</label>
                    <input
                      type="number"
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon font-semibold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedContact && ledgerData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 fade-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold truncate text-slate-800">Statement of Account</h3>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-600">{selectedContact.name}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Opening: {formatCurrency(ledgerData.openingBalance)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Modal Content - Scrollable Table */}
            <div className="flex-1 overflow-auto overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/80">Date</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/80">Details</th>
                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/80">Debit (+)</th>
                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/80">Credit (-)</th>
                    <th className="text-right py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/80 border-l border-slate-100">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.entries.map((entry: any, index: number) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-600">{entry.date}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-800">{entry.description}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {entry.debit > 0 ? (
                          <span className="text-sm font-bold text-red-500">+{formatCurrency(entry.debit)}</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {entry.credit > 0 ? (
                          <span className="text-sm font-bold text-emerald-600">-{formatCurrency(entry.credit)}</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-4 px-6 text-right bg-slate-50/30 border-l border-slate-100">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(Math.abs(entry.balance))}</span>
                        <span className="text-[10px] ml-1 font-semibold text-slate-500">{entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ledgerData.entries.length === 0 && (
                <div className="py-16 text-center">
                  <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-300 mb-3">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-600 mb-1">No Transactions</h4>
                  <p className="text-xs font-medium text-slate-400">There are no ledger entries for this account yet.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Outstanding</p>
                <p className="text-xs font-medium text-slate-400">Running balance to date</p>
              </div>
              <div className="px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <p className={`text-2xl font-black ${ledgerData.currentBalance > 0 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                  {formatCurrency(Math.abs(ledgerData.currentBalance))}
                </p>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${ledgerData.currentBalance > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                  {ledgerData.currentBalance > 0 ? 'Due' : 'Credit'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
