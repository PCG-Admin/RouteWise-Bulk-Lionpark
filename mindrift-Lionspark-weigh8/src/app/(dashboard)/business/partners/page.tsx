'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Truck, UserCircle, Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import MasterDataTable from '@/components/MasterDataTable';
import FormModal from '@/components/FormModal';

const API_URL = 'http://localhost:3001/api';
const SITE_ID = 1; // Lions Park

type TabType = 'freight-companies' | 'clients' | 'transporters' | 'drivers';

interface FreightCompany {
  id?: number;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

interface Client {
  id?: number;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

interface Transporter {
  id?: number;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

interface Driver {
  id?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  idNumber: string;
  transporterId: number | null;
  transporterName?: string;
  inductionCompleted: boolean;
}

export default function PartnersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('freight-companies');
  const [loading, setLoading] = useState(false);

  // Data states
  const [freightCompanies, setFreightCompanies] = useState<FreightCompany[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'freight-companies', label: 'Freight Companies', icon: Building2, color: 'purple' },
    { id: 'clients', label: 'Clients / Traders', icon: Users, color: 'green' },
    { id: 'transporters', label: 'Transporters', icon: Truck, color: 'blue' },
    { id: 'drivers', label: 'Drivers', icon: UserCircle, color: 'orange' },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'freight-companies':
          await fetchFreightCompanies();
          break;
        case 'clients':
          await fetchClients();
          break;
        case 'transporters':
          await fetchTransporters();
          break;
        case 'drivers':
          await fetchDrivers();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFreightCompanies = async () => {
    const response = await fetch(`${API_URL}/freight-companies?siteId=${SITE_ID}`);
    const result = await response.json();
    if (result.success) setFreightCompanies(result.data);
  };

  const fetchClients = async () => {
    const response = await fetch(`${API_URL}/clients?siteId=${SITE_ID}`);
    const result = await response.json();
    if (result.success) setClients(result.data);
  };

  const fetchTransporters = async () => {
    const response = await fetch(`${API_URL}/transporters?siteId=${SITE_ID}`);
    const result = await response.json();
    if (result.success) setTransporters(result.data);
  };

  const fetchDrivers = async () => {
    const response = await fetch(`${API_URL}/drivers?siteId=${SITE_ID}`);
    const result = await response.json();
    if (result.success) setDrivers(result.data);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    const endpoint = `${API_URL}/${activeTab}/${item.id}`;
    const response = await fetch(endpoint, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      alert('Deleted successfully');
      fetchData();
    }
  };

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      const endpoint = editingItem
        ? `${API_URL}/${activeTab}/${editingItem.id}`
        : `${API_URL}/${activeTab}`;

      const response = await fetch(endpoint, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteId: SITE_ID }),
      });

      const result = await response.json();
      if (result.success) {
        alert(editingItem ? 'Updated successfully' : 'Created successfully');
        setModalOpen(false);
        fetchData();
      } else {
        alert(result.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  // Column definitions for each tab
  const getColumns = () => {
    switch (activeTab) {
      case 'freight-companies':
      case 'clients':
      case 'transporters':
        return [
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          {
            key: 'isActive',
            label: 'Status',
            render: (value: boolean) => (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {value ? 'Active' : 'Inactive'}
              </span>
            ),
          },
        ];
      case 'drivers':
        return [
          {
            key: 'firstName',
            label: 'Name',
            render: (_: any, row: Driver) => `${row.firstName} ${row.lastName}`,
          },
          { key: 'idNumber', label: 'ID Number' },
          { key: 'licenseNumber', label: 'License' },
          { key: 'phone', label: 'Phone' },
          {
            key: 'transporterName',
            label: 'Transporter',
            render: (value: string) => value || '-',
          },
          {
            key: 'inductionCompleted',
            label: 'Induction',
            render: (value: boolean) =>
              value ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">Done</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">Pending</span>
                </div>
              ),
          },
        ];
      default:
        return [];
    }
  };

  const getData = () => {
    switch (activeTab) {
      case 'freight-companies': return freightCompanies;
      case 'clients': return clients;
      case 'transporters': return transporters;
      case 'drivers': return drivers;
      default: return [];
    }
  };

  const getTabTitle = () => {
    return tabs.find(t => t.id === activeTab)?.label || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3 flex items-center gap-3">
            <Building2 className="w-10 h-10 text-blue-600" />
            Business Partners & Master Data
          </h1>
          <p className="text-lg text-slate-600">
            Manage freight companies, clients, transporters, and drivers for Lions Park site
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-500/30`
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/20' : 'bg-slate-200'
                  }`}>
                    {getData().length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <MasterDataTable
          title={getTabTitle()}
          data={getData()}
          columns={getColumns()}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder={`Search ${getTabTitle().toLowerCase()}...`}
          loading={loading}
        />

        {/* Form Modal */}
        {modalOpen && (
          <FormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={`${editingItem ? 'Edit' : 'Add'} ${getTabTitle().slice(0, -1)}`}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const data = Object.fromEntries(formData.entries());
              handleSave(data);
            }}
            loading={saving}
          >
            {activeTab === 'drivers' ? (
              <DriverForm editingItem={editingItem} transporters={transporters} />
            ) : (
              <CompanyForm editingItem={editingItem} />
            )}
          </FormModal>
        )}
      </div>
    </div>
  );
}

// Company/Client/Transporter Form
function CompanyForm({ editingItem }: { editingItem: any }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editingItem?.name}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
        <input
          name="code"
          type="text"
          defaultValue={editingItem?.code}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
          <input
            name="contactPerson"
            type="text"
            defaultValue={editingItem?.contactPerson}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={editingItem?.phone}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={editingItem?.email}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <textarea
          name="address"
          rows={3}
          defaultValue={editingItem?.address}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={editingItem?.isActive ?? true}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <label className="text-sm font-medium text-slate-700">Active</label>
      </div>
    </div>
  );
}

// Driver Form
function DriverForm({ editingItem, transporters }: { editingItem: any; transporters: Transporter[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            name="firstName"
            type="text"
            required
            defaultValue={editingItem?.firstName}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            name="lastName"
            type="text"
            required
            defaultValue={editingItem?.lastName}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Transporter</label>
        <select
          name="transporterId"
          defaultValue={editingItem?.transporterId}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select transporter...</option>
          {transporters.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
          <input
            name="idNumber"
            type="text"
            defaultValue={editingItem?.idNumber}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
          <input
            name="licenseNumber"
            type="text"
            defaultValue={editingItem?.licenseNumber}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={editingItem?.phone}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={editingItem?.email}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          name="inductionCompleted"
          type="checkbox"
          defaultChecked={editingItem?.inductionCompleted}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <label className="text-sm font-medium text-slate-700">Induction Completed</label>
      </div>
    </div>
  );
}
