import React, { useState } from 'react';
import { Shield, User, UserCheck } from 'lucide-react';
import SearchAndFilter from '../components/UI/SearchAndFilter';
import Pagination from '../components/UI/Pagination';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Breadcrumb from '../components/UI/Breadcrumb';
import SortableTable, { SortDirection } from '../components/UI/SortableTable';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { CreditCard, FileText, Camera } from 'lucide-react';

// Define types for API response
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string | Date;
  roles?: string[];
  verification?: {
    idFrontUrl?: string;
    idBackUrl?: string;
    criminalRecordUrl?: string;
    selfieUrl?: string;
  };
}
interface UsersApiResponse {
  users: User[];
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Utility to map backend user to frontend
function mapUser(raw: unknown): User {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid user object');
  const obj = raw as Record<string, unknown>;
  
  // Construct address from location fields
  let address = '';
  if (obj.profile && typeof obj.profile === 'object') {
    const profile = obj.profile as Record<string, unknown>;
    if (profile.location && typeof profile.location === 'object') {
      const location = profile.location as Record<string, unknown>;
      const parts = [];
      
      if (location.government) parts.push(String(location.government));
      if (location.city) parts.push(String(location.city));
      if (location.street) parts.push(String(location.street));
      if (location.apartmentNumber) parts.push(String(location.apartmentNumber));
      if (location.additionalInformation) parts.push(String(location.additionalInformation));
      
      address = parts.length > 0 ? parts.join('، ') : '';
    }
  }
  
  return {
    id: String(obj._id || obj.id),
    name: obj.name && typeof obj.name === 'object' ? `${(obj.name as Record<string, unknown>).first} ${(obj.name as Record<string, unknown>).last}` : String(obj.name),
    email: String(obj.email),
    phone: String(obj.phone),
    address: address || 'غير محدد',
    isVerified: typeof obj.isVerified === 'boolean' ? obj.isVerified : false,
    isBlocked: Boolean(obj.isBlocked),
    createdAt: String(obj.createdAt),
    roles: Array.isArray(obj.roles) ? obj.roles as string[] : [],
    verification: obj.verification as Record<string, unknown> as User['verification'],
  };
}

const fetchUsers = async ({ page, search, filter, token }: { page: number; search: string; filter: string; token: string | null; }): Promise<UsersApiResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  if (search) params.append('search', search);
  if (filter && filter !== 'all') {
    if (filter === 'verified') params.append('isVerified', 'true');
    else if (filter === 'unverified') params.append('isVerified', 'false');
    else if (filter === 'blocked') params.append('isBlocked', 'true');
  }
  console.debug('[fetchUsers] token:', token);
  const res = await fetch(`/api/users?${params.toString()}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('فشل تحميل المستخدمين');
  const raw = await res.json();
  // Debug log
  console.debug('[fetchUsers] response:', raw);
  // Support both { users, total, ... } and { data: { users, total, ... } }
  const data = raw.users ? raw : raw.data;
  return {
    users: (data.users || []).map(mapUser),
    totalPages: data.totalPages || Math.ceil((data.total || 0) / (data.limit || 10)),
    totalItems: data.total || 0,
    itemsPerPage: data.limit || 10,
  };
};

const blockUser = async (userId: string, block: boolean, token: string | null) => {
  const endpoint = block ? `/api/users/${userId}/block` : `/api/users/${userId}/unblock`;
  console.debug('[blockUser] token:', token, 'userId:', userId, 'block:', block);
  const res = await fetch(endpoint, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('فشل تحديث حالة المستخدم');
  return res.json();
};

const USER_STATUS_VARIANT_MAP: Record<string, 'status' | 'category' | 'premium' | 'top-rated' | 'urgency'> = {
  blocked: 'urgency',
  verified: 'category',
  unverified: 'status',
};

const ExpandableBadges = ({ user, expanded, onToggle }: { user: User; expanded: boolean; onToggle: () => void }) => {
  const verification = user.verification || {};
  const badges = [];
  // Status badge
  if (user.roles && user.roles.includes('admin')) {
    badges.push(<Badge key="admin" variant="premium" size="sm" icon={Shield}>Admin</Badge>);
  } else if (user.isBlocked) {
    badges.push(<Badge key="blocked" variant={USER_STATUS_VARIANT_MAP['blocked']} size="sm" icon={Shield}>محظور</Badge>);
  } else if (user.isVerified) {
    badges.push(<Badge key="verified" variant={USER_STATUS_VARIANT_MAP['verified']} size="sm" icon={UserCheck}>موثق</Badge>);
  } else {
    badges.push(<Badge key="unverified" variant={USER_STATUS_VARIANT_MAP['unverified']} size="sm" icon={User}>غير موثق</Badge>);
  }
  // Verification method badges
  if (verification.idFrontUrl && verification.idBackUrl) {
    badges.push(<Badge key="id" variant="category" size="sm" icon={CreditCard}>بطاقة هوية</Badge>);
  }
  if (verification.criminalRecordUrl) {
    badges.push(<Badge key="criminal" variant="premium" size="sm" icon={FileText}>فيش وتشبيه</Badge>);
  }
  if (verification.selfieUrl) {
    badges.push(<Badge key="selfie" variant="status" size="sm" icon={Camera}>سيلفي</Badge>);
  }
  // Truncation logic
  if (!expanded && badges.length > 1) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        {badges[0]}
        <button onClick={onToggle} className="text-xs px-2 py-1 rounded-md bg-deep-teal/10 text-deep-teal hover:bg-deep-teal/20 ml-1">عرض كامل</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 min-w-0 flex-wrap">
      {badges}
      {badges.length > 1 && (
        <button onClick={onToggle} className="text-xs px-2 py-1 rounded-md bg-deep-teal/10 text-deep-teal hover:bg-deep-teal/20 ml-1">تصغير</button>
      )}
    </div>
  );
};

const AdminManageUsers: React.FC = () => {
  const { accessToken, user: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [expandedBadges, setExpandedBadges] = useState<Set<string>>(new Set());

  // Toggle address expansion
  const toggleAddressExpansion = (userId: string) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Expandable address component
  const ExpandableAddress = ({ address, userId, isBlocked }: { address: string; userId: string; isBlocked: boolean }) => {
    const isExpanded = expandedAddresses.has(userId);
    const shouldTruncate = address.length > 25;
    
    if (!shouldTruncate) {
      return (
        <span className={isBlocked ? 'text-red-600' : 'text-deep-teal'}>
          {address || 'غير محدد'}
        </span>
      );
    }

    return (
      <div className="flex items-start gap-2 group">
        <div className="flex-1 min-w-0">
          <span 
            className={`${isBlocked ? 'text-red-600' : 'text-deep-teal'} ${
              isExpanded ? '' : 'truncate block max-w-[180px]'
            }`}
            title={!isExpanded ? address : undefined}
          >
            {isExpanded ? address : `${address.substring(0, 25)}...`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAddressExpansion(userId);
          }}
          className={`text-xs px-2 py-1 rounded-md transition-all duration-200 flex-shrink-0 ${
            isBlocked 
              ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-2 focus:ring-red-300' 
              : 'bg-deep-teal/10 text-deep-teal hover:bg-deep-teal/20 focus:ring-2 focus:ring-deep-teal/30'
          }`}
          title={isExpanded ? 'تصغير العنوان' : 'عرض العنوان كاملاً'}
          aria-label={isExpanded ? 'تصغير العنوان' : 'عرض العنوان كاملاً'}
        >
          {isExpanded ? 'تصغير' : 'عرض كامل'}
        </button>
      </div>
    );
  };

  const toggleBadgeExpansion = (userId: string) => {
    setExpandedBadges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<UsersApiResponse, Error>({
    queryKey: ['users', currentPage, searchTerm, filterValue, accessToken],
    queryFn: () => fetchUsers({ page: currentPage, search: searchTerm, filter: filterValue, token: accessToken }),
    // keepPreviousData: true, // Not supported in object syntax in React Query v5+
  });

  const queryClient = useQueryClient();
  const blockMutation = useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) => blockUser(userId, block, accessToken),
    onSuccess: (_, { block }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess(
        block ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم بنجاح'
      );
    },
    onError: (error) => {
      showError('فشل تحديث حالة المستخدم', error.message);
    },
  });

  const handleToggleUserBlock = (user: User) => {
    // Prevent admin from blocking themselves
    if (currentUser && user.id === currentUser.id) {
      showError('لا يمكنك حظر نفسك', 'لا يمكن للمدير حظر حسابه الخاص');
      return;
    }
    
    setSelectedUser(user);
    setIsConfirmModalOpen(true);
  };

  const confirmToggleBlock = () => {
    if (selectedUser) {
      blockMutation.mutate({ userId: selectedUser.id, block: !selectedUser.isBlocked });
    }
    setIsConfirmModalOpen(false);
    setSelectedUser(null);
  };

  const users = (data?.users || []) as User[];
  // Map users to Record<string, unknown> for the table
  const tableData: Record<string, unknown>[] = users.map(u => ({ ...u }));
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;
  const itemsPerPage = data?.itemsPerPage || 10;

  const filterOptions = [
    { value: 'all', label: 'جميع المستخدمين' },
    { value: 'verified', label: 'موثق' },
    { value: 'unverified', label: 'غير موثق' },
    { value: 'blocked', label: 'محظور' }
  ];

  const tableColumns = [
    {
      key: 'name' as keyof User,
      label: 'الاسم',
      sortable: true,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        return (
        <span className={`font-medium ${user.isBlocked ? 'text-red-600' : 'text-deep-teal'}`}>
          {String(value)}
        </span>
        );
      }
    },
    {
      key: 'email' as keyof User,
      label: 'البريد الإلكتروني',
      sortable: true,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        return (
        <span className={user.isBlocked ? 'text-red-600' : 'text-deep-teal'}>
          {String(value)}
        </span>
        );
      }
    },
    {
      key: 'phone' as keyof User,
      label: 'رقم الهاتف',
      sortable: false,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        return (
        <span className={user.isBlocked ? 'text-red-600' : 'text-deep-teal'}>
          {String(value)}
        </span>
        );
      }
    },
    {
      key: 'address' as keyof User,
      label: 'العنوان',
      sortable: false,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        return (
        <ExpandableAddress
          address={user.address}
          userId={user.id}
          isBlocked={user.isBlocked}
        />
        );
      }
    },
    {
      key: 'isVerified' as keyof User,
      label: 'الحالة',
      sortable: true,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        return (
          <ExpandableBadges
            user={user}
            expanded={expandedBadges.has(user.id)}
            onToggle={() => toggleBadgeExpansion(user.id)}
          />
        );
      }
    },
    {
      key: 'id' as keyof User,
      label: 'الإجراء',
      sortable: false,
      render: (value: unknown, row: Record<string, unknown>) => {
        const user = row as unknown as User;
        const isCurrentUser = currentUser && user.id === currentUser.id;
        return (
          <Button
            variant={user.isBlocked ? 'danger' : 'secondary'}
            size="md"
            leftIcon={user.isBlocked ? <UserCheck className="h-4 w-4 mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
            onClick={() => handleToggleUserBlock(user)}
            loading={blockMutation.isPending && selectedUser?.id === user.id}
            disabled={isCurrentUser || false}
            title={isCurrentUser ? 'لا يمكنك حظر نفسك' : undefined}
          >
            {isCurrentUser ? 'حسابك' : (user.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم')}
          </Button>
        );
      }
    }
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[300px] text-lg text-deep-teal">جاري التحميل...</div>
  );
  
  if (isError) return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'إدارة المستخدمين' }]} />
      <h1 className="text-3xl font-bold text-deep-teal">إدارة المستخدمين</h1>
      <div className="text-center py-8 text-red-600">{(error as Error).message}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'إدارة المستخدمين' }]} />
      <h1 className="text-3xl font-bold text-deep-teal">إدارة المستخدمين</h1>
      
      <div className="bg-light-cream rounded-2xl p-8 shadow-md">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterValue={filterValue}
          onFilterChange={setFilterValue}
          filterOptions={filterOptions}
          placeholder="ابحث عن المستخدمين بالاسم أو البريد الإلكتروني أو رقم الهاتف"
        />

        <SortableTable
          data={tableData}
          columns={tableColumns}
          onSort={(key, direction) => {
            setSortKey(key as string);
            setSortDirection(direction);
          }}
          sortKey={sortKey}
          sortDirection={sortDirection}
          className="mt-8"
          emptyMessage="لا توجد مستخدمين"
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmToggleBlock}
        title={selectedUser?.isBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
        message={`هل أنت متأكد من ${selectedUser?.isBlocked ? 'إلغاء حظر' : 'حظر'} المستخدم "${selectedUser?.name}"؟`}
        confirmText={selectedUser?.isBlocked ? 'إلغاء الحظر' : 'حظر'}
        type="warning"
        isLoading={blockMutation.isPending}
      />
    </div>
  );
};

export default AdminManageUsers;