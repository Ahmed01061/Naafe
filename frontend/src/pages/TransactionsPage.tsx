import React, { useEffect, useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import SortableTable, { SortDirection } from '../admin/components/UI/SortableTable';
// Inline Column type from SortableTable
interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
}
import { useAuth } from '../contexts/AuthContext';
import { Search } from 'lucide-react';
import Modal from '../admin/components/UI/Modal';
import FormInput from '../components/ui/FormInput';
import UnifiedSelect from '../components/ui/UnifiedSelect';

// Update Transaction type for unified API
interface Transaction {
  id: string;
  type: 'service' | 'subscription' | 'refund' | 'ad' | string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  description: string;
  relatedId?: string;
  adData?: {
    title: string;
    placement: {
      location: string;
      type: string;
    };
    duration: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For SortableTable compatibility
}

const TransactionsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Transaction | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/payment/transactions?page=${page}&limit=20`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (data.success) {
          setTransactions(data.data.transactions);
          setTotalPages(data.data.pagination.pages);
        } else {
          setError(data.message || 'فشل في جلب المعاملات');
        }
      } catch {
        setError('حدث خطأ أثناء جلب المعاملات');
      } finally {
        setLoading(false);
      }
    };
    if (accessToken) fetchTransactions();
  }, [accessToken, page]);

  // Filtering
  const filtered = transactions.filter(t => {
    if (search) {
      const serviceTitleMatch = t.description?.toLowerCase().includes(search.toLowerCase());
      // Assuming seekerId and providerId are not directly available in this new structure
      // For now, we'll rely on description for search
      return serviceTitleMatch;
    }
    if (statusFilter) {
      return t.status === statusFilter;
    }
    if (typeFilter) {
      return t.type === typeFilter;
    }
    if (dateFrom) {
      return new Date(t.date) >= new Date(dateFrom);
    }
    if (dateTo) {
      return new Date(t.date) <= new Date(dateTo);
    }
    return true;
  });

  // Icon/color for type
  const typeIcon = (type: string) => {
    switch (type) {
      case 'service': return <span className="text-blue-600" title="دفع خدمة">🛠️</span>;
      case 'subscription': return <span className="text-yellow-600" title="اشتراك">⭐</span>;
      case 'refund': return <span className="text-green-600" title="استرداد">↩️</span>;
      case 'ad': return <span className="text-green-600" title="إعلان">📢</span>;
      default: return <span>💸</span>;
    }
  };

  // Move these outside the render function so they are accessible in the modal too
  const statusMap: Record<string, string> = {
    succeeded: 'مكتمل',
    refunded: 'مسترد',
    failed: 'فشل',
    pending: 'قيد الانتظار',
    canceled: 'ملغي',
    cancelled: 'ملغي',
    inactive: 'غير نشط',
    active: 'نشط',
    completed: 'مكتمل',
    escrowed: 'محتجز في الضمان',
    partial_refund: 'استرداد جزئي',
    paused: 'متوقف مؤقتاً',
    rejected: 'مرفوض',
  };
  const colorMap: Record<string, string> = {
    succeeded: 'text-green-600',
    refunded: 'text-purple-600',
    failed: 'text-red-600',
    pending: 'text-amber-600',
    canceled: 'text-gray-500',
    cancelled: 'text-gray-500',
    inactive: 'text-gray-500',
    active: 'text-green-600',
    completed: 'text-green-600',
    escrowed: 'text-blue-600',
    partial_refund: 'text-orange-500',
    paused: 'text-orange-500',
    rejected: 'text-red-600',
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      label: 'التاريخ',
      sortable: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString('ar-EG') : '',
    },
    {
      key: 'type',
      label: 'النوع',
      sortable: false,
      render: (value, item) => <span className="flex items-center gap-1">{typeIcon(item.type)} {item.type === 'service' ? 'خدمة' : item.type === 'subscription' ? 'اشتراك' : item.type === 'refund' ? 'استرداد' : item.type === 'ad' ? 'إعلان' : 'أخرى'}</span>,
    },
    {
      key: 'description',
      label: 'الوصف',
      sortable: false,
      render: (value) => value as string || '',
    },
    {
      key: 'amount',
      label: 'المبلغ',
      sortable: true,
      render: (value, item) => value !== undefined ? `${value} ${(item.currency === 'EGP' ? 'جنيه' : (item.currency as string).toUpperCase())}` : '',
    },
    {
      key: 'status',
      label: 'الحالة',
      sortable: true,
      render: (value) => {
        const v = value as string;
        return <span className={`font-bold ${colorMap[v] || ''}`}>{statusMap[v] || v}</span>;
      },
    },
  ];

  const handleSort = (key: keyof Transaction, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'معاملاتي', active: true },
  ];

  return (
    <PageLayout title="معاملاتي" breadcrumbItems={breadcrumbItems}>
      <BaseCard>
        <h2 className="text-2xl font-bold mb-6 text-deep-teal">سجل المعاملات المالية</h2>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <FormInput
              type="text"
              variant="default"
              size="md"
              placeholder="ابحث عن معاملة أو خدمة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="min-w-[160px]">
            <UnifiedSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'succeeded', label: 'مكتمل' },
                { value: 'refunded', label: 'مسترد' },
                { value: 'failed', label: 'فشل' },
                { value: 'pending', label: 'قيد الانتظار' },
                { value: 'canceled', label: 'ملغي' },
                { value: 'cancelled', label: 'ملغي' },
                { value: 'inactive', label: 'غير نشط' },
                { value: 'active', label: 'نشط' },
                { value: 'completed', label: 'مكتمل' },
                { value: 'escrowed', label: 'محتجز في الضمان' },
                { value: 'paused', label: 'متوقف مؤقتاً' },
                { value: 'rejected', label: 'مرفوض' },
              ]}
              placeholder="اختر الحالة"
              size="md"
            />
          </div>
          <div className="min-w-[160px]">
            <UnifiedSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'service', label: 'خدمة' },
                { value: 'subscription', label: 'اشتراك' },
                { value: 'refund', label: 'استرداد' },
                { value: 'ad', label: 'إعلان' },
              ]}
              placeholder="اختر النوع"
              size="md"
            />
          </div>
          <div className="min-w-[140px]">
            <FormInput
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="من التاريخ"
              variant="default"
              size="md"
            />
          </div>
          <div className="min-w-[140px]">
            <FormInput
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="إلى التاريخ"
              variant="default"
              size="md"
            />
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12 text-text-secondary">جاري تحميل المعاملات...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <SortableTable<Transaction>
            data={filtered}
            columns={columns}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            emptyMessage="لا توجد معاملات حتى الآن"
          />
        )}
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            السابق
          </Button>
          <span className="px-4 py-2 text-text-secondary">صفحة {page} من {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            التالي
          </Button>
        </div>
      </BaseCard>
      {/* Transaction Details Modal */}
      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="تفاصيل المعاملة"
        size="md"
      >
        {selectedTransaction && (
          <div className="space-y-3 text-sm">
            <div><span className="font-bold">النوع:</span> {selectedTransaction.type === 'service' ? 'خدمة' : selectedTransaction.type === 'subscription' ? 'اشتراك' : selectedTransaction.type === 'refund' ? 'استرداد' : 'أخرى'}</div>
            <div><span className="font-bold">الوصف:</span> {selectedTransaction.description}</div>
            <div><span className="font-bold">المبلغ:</span> {selectedTransaction.amount} {selectedTransaction.currency === 'EGP' ? 'جنيه' : selectedTransaction.currency.toUpperCase()}</div>
            <div><span className="font-bold">الحالة:</span> {statusMap[selectedTransaction.status] || selectedTransaction.status}</div>
            <div><span className="font-bold">تاريخ المعاملة:</span> {new Date(selectedTransaction.date).toLocaleString('ar-EG')}</div>
            {/* Add more fields as needed */}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default TransactionsPage; 