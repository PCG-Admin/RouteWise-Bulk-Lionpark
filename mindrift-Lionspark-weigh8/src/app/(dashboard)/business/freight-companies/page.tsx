'use client';

import { useState, useEffect } from 'react';
import MasterDataTable from '@/components/MasterDataTable';
import FormModal from '@/components/FormModal';

const API_URL = 'http://localhost:3001/api';
const SITE_ID = 1; // Lions Park

interface FreightCompany {
  id?: number;
  siteId: number;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export default function FreightCompaniesPage() {
  const [companies, setCompanies] = useState<FreightCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<FreightCompany | null>(null);
  const [formData, setFormData] = useState<FreightCompany>({
    siteId: SITE_ID,
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/freight-companies?siteId=${SITE_ID}`);
      const result = await response.json();
      if (result.success) {
        setCompanies(result.data);
      }
    } catch (error) {
      console.error('Error fetching freight companies:', error);
      alert('Failed to fetch freight companies');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setFormData({
      siteId: SITE_ID,
      name: '',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (company: FreightCompany) => {
    setEditingCompany(company);
    setFormData(company);
    setModalOpen(true);
  };

  const handleDelete = async (company: FreightCompany) => {
    try {
      const response = await fetch(`${API_URL}/freight-companies/${company.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        alert('Freight company deleted successfully');
        fetchCompanies();
      } else {
        alert(result.error || 'Failed to delete freight company');
      }
    } catch (error) {
      console.error('Error deleting freight company:', error);
      alert('Failed to delete freight company');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCompany
        ? `${API_URL}/freight-companies/${editingCompany.id}`
        : `${API_URL}/freight-companies`;

      const response = await fetch(url, {
        method: editingCompany ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        alert(editingCompany ? 'Freight company updated successfully' : 'Freight company created successfully');
        setModalOpen(false);
        fetchCompanies();
      } else {
        alert(result.error || 'Failed to save freight company');
      }
    } catch (error) {
      console.error('Error saving freight company:', error);
      alert('Failed to save freight company');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Company Name' },
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Freight Companies</h1>
          <p className="text-slate-600">
            Manage freight/logistics companies (e.g., Bulk Connections, Bidvest Port Operations)
          </p>
        </div>

        <MasterDataTable
          title="Freight Companies"
          data={companies}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search by name, code, or contact..."
          loading={loading}
        />

        <FormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingCompany ? 'Edit Freight Company' : 'Add Freight Company'}
          onSubmit={handleSubmit}
          loading={saving}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Bulk Connections"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BC001"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+27 12 345 6789"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main Street, City"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                Active
              </label>
            </div>
          </div>
        </FormModal>
      </div>
    </div>
  );
}
