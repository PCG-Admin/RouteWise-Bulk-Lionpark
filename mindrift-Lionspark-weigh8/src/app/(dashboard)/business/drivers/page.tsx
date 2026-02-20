'use client';

import { useState, useEffect } from 'react';
import MasterDataTable from '@/components/MasterDataTable';
import FormModal from '@/components/FormModal';
import { CheckCircle, XCircle } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`;
const SITE_ID = 1; // Lions Park

interface Driver {
  id?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseClass: string;
  licenseExpiry: string;
  idNumber: string;
  passportNumber: string;
  cutlerPermitNumber: string;
  cutlerPermitExpiry: string;
  boardNumber: string;
  transporterId: number | null;
  transporterName?: string;
  employeeId: string;
  inductionCompleted: boolean;
}

interface Transporter {
  id: number;
  name: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Driver>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseClass: '',
    licenseExpiry: '',
    idNumber: '',
    passportNumber: '',
    cutlerPermitNumber: '',
    cutlerPermitExpiry: '',
    boardNumber: '',
    transporterId: null,
    employeeId: '',
    inductionCompleted: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDrivers();
    fetchTransporters();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/drivers?siteId=${SITE_ID}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setDrivers(result.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      const response = await fetch(`${API_URL}/transporters?siteId=${SITE_ID}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setTransporters(result.data);
      }
    } catch (error) {
      console.error('Error fetching transporters:', error);
    }
  };

  const handleAdd = () => {
    setEditingDriver(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      licenseClass: '',
      licenseExpiry: '',
      idNumber: '',
      passportNumber: '',
      cutlerPermitNumber: '',
      cutlerPermitExpiry: '',
      boardNumber: '',
      transporterId: null,
      employeeId: '',
      inductionCompleted: false,
    });
    setModalOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData(driver);
    setModalOpen(true);
  };

  const handleDelete = async (driver: Driver) => {
    try {
      const response = await fetch(`${API_URL}/drivers/${driver.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        alert('Driver deleted successfully');
        fetchDrivers();
      } else {
        alert(result.error || 'Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingDriver
        ? `${API_URL}/drivers/${editingDriver.id}`
        : `${API_URL}/drivers`;

      const response = await fetch(url, {
        method: editingDriver ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        alert(editingDriver ? 'Driver updated successfully' : 'Driver created successfully');
        setModalOpen(false);
        fetchDrivers();
      } else {
        alert(result.error || 'Failed to save driver');
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      alert('Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'firstName',
      label: 'Name',
      render: (_: any, row: Driver) => `${row.firstName} ${row.lastName}`,
    },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'licenseNumber', label: 'License Number' },
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
            <span className="text-xs font-semibold">Completed</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600">
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Pending</span>
          </div>
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Drivers</h1>
          <p className="text-slate-600">
            Manage drivers linked to transporter companies (site access inherited through transporter)
          </p>
        </div>

        <MasterDataTable
          title="Drivers"
          data={drivers}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search by name, ID number, or license..."
          loading={loading}
        />

        <FormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDriver ? 'Edit Driver' : 'Add Driver'}
          onSubmit={handleSubmit}
          loading={saving}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Transporter Company
              </label>
              <select
                value={formData.transporterId || ''}
                onChange={(e) => setFormData({ ...formData, transporterId: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="9401015800083"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={formData.passportNumber}
                  onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="A12345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABC123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  License Class
                </label>
                <input
                  type="text"
                  value={formData.licenseClass}
                  onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Code 14"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License Expiry Date
              </label>
              <input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cutler Permit Number
                </label>
                <input
                  type="text"
                  value={formData.cutlerPermitNumber}
                  onChange={(e) => setFormData({ ...formData, cutlerPermitNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CP12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cutler Permit Expiry
                </label>
                <input
                  type="date"
                  value={formData.cutlerPermitExpiry}
                  onChange={(e) => setFormData({ ...formData, cutlerPermitExpiry: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Board Number
                </label>
                <input
                  type="text"
                  value={formData.boardNumber}
                  onChange={(e) => setFormData({ ...formData, boardNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="BN001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="EMP001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="driver@company.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inductionCompleted"
                checked={formData.inductionCompleted}
                onChange={(e) => setFormData({ ...formData, inductionCompleted: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="inductionCompleted" className="text-sm font-medium text-slate-700">
                Induction Completed
              </label>
            </div>
          </div>
        </FormModal>
      </div>
    </div>
  );
}
