import User from '../models/User.js';
import ServiceListing from '../models/ServiceListing.js';
import Offer from '../models/Offer.js';
import JobRequest from '../models/JobRequest.js';
import Category from '../models/Category.js';
import Complaint from '../models/Complaint.js';

class AdminService {
  /**
   * Get dashboard statistics for admin overview
   */
  async getDashboardStats() {
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Active services
    const activeServices = await ServiceListing.countDocuments({ status: 'active' });
    
    // Active service requests
    const activeRequests = await JobRequest.countDocuments({ status: 'open' });
    
    // Monthly revenue (sum of accepted offers in the last 30 days)
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    const monthlyRevenueAgg = await Offer.aggregate([
      { $match: { status: 'accepted', updatedAt: { $gte: monthAgo } } },
      { $group: { _id: null, total: { $sum: '$budget.max' } } }
    ]);
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;
    
    // User growth (users registered in last 30 days)
    const userGrowth = await User.countDocuments({ createdAt: { $gte: monthAgo } });
    
    // Service growth (services created in last 30 days)
    const serviceGrowth = await ServiceListing.countDocuments({ createdAt: { $gte: monthAgo } });
    
    // Request growth (requests created in last 30 days)
    const requestGrowth = await JobRequest.countDocuments({ createdAt: { $gte: monthAgo } });
    
    // Revenue growth (revenue in last 30 days vs previous 30 days)
    const prevMonthAgo = new Date(monthAgo);
    prevMonthAgo.setDate(monthAgo.getDate() - 30);
    const prevMonthlyRevenueAgg = await Offer.aggregate([
      { $match: { status: 'accepted', updatedAt: { $gte: prevMonthAgo, $lt: monthAgo } } },
      { $group: { _id: null, total: { $sum: '$budget.max' } } }
    ]);
    const prevMonthlyRevenue = prevMonthlyRevenueAgg[0]?.total || 0;
    const revenueGrowth = prevMonthlyRevenue === 0 ? 0 : ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100;
    
    // Pending complaints
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    
    return {
      totalUsers,
      activeServices,
      activeRequests,
      monthlyRevenue,
      userGrowth,
      serviceGrowth,
      requestGrowth,
      revenueGrowth: Math.round(revenueGrowth),
      pendingComplaints
    };
  }

  /**
   * Get user growth data for charts
   */
  async getUserGrowthData() {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format data for chart
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const chartData = months.map((month, index) => {
      const monthData = userGrowthData.find(d => d._id.month === index + 1);
      return monthData ? monthData.count : 0;
    });

    return chartData;
  }

  /**
   * Get service categories data for charts
   */
  async getServiceCategoriesData() {
    // Fetch all categories (active only)
    const allCategories = await Category.find({ isActive: true }, 'name');
    // Aggregate counts by category string from ServiceListing
    const categoriesData = await ServiceListing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    // Map: category name => count
    const countMap = new Map(categoriesData.map(cat => [cat._id, cat.count]));
    // Build result for all categories
    let result = allCategories.map(cat => ({
      name: cat.name,
      count: countMap.get(cat.name) || 0
    }));
    // Sort by count descending, then name
    result = result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    // Limit to top 6
    result = result.slice(0, 6);
    return {
      labels: result.map(cat => cat.name),
      data: result.map(cat => cat.count)
    };
  }

  /**
   * Get revenue data for charts
   */
  async getRevenueData() {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const revenueData = await Offer.aggregate([
      {
        $match: {
          status: 'accepted',
          updatedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' }
          },
          revenue: { $sum: '$budget.max' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format data for chart
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const chartData = months.map((month, index) => {
      const monthData = revenueData.find(d => d._id.month === index + 1);
      return monthData ? monthData.revenue : 0;
    });

    return chartData;
  }

  /**
   * Get recent activity data
   */
  async getRecentActivity() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const activities = [];

    // Recent user registrations
    const recentUsers = await User.find({ createdAt: { $gte: weekAgo } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    recentUsers.forEach(user => {
      activities.push({
        id: user._id.toString(),
        type: 'user_signup',
        message: `تسجيل جديد للمستخدم: ${user.name.first} ${user.name.last}`,
        timestamp: user.createdAt,
        icon: 'CheckCircle',
        color: 'bg-green-500'
      });
    });

    // Recent service listings
    const recentServices = await ServiceListing.find({ createdAt: { $gte: weekAgo } })
      .populate('provider', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title provider createdAt');

    recentServices.forEach(service => {
      activities.push({
        id: service._id.toString(),
        type: 'service_posted',
        message: `تم نشر خدمة جديدة: ${service.title}`,
        timestamp: service.createdAt,
        icon: 'Plus',
        color: 'bg-bright-orange'
      });
    });

    // Recent job requests
    const recentRequests = await JobRequest.find({ createdAt: { $gte: weekAgo } })
      .populate('seeker', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title seeker createdAt');

    recentRequests.forEach(request => {
      activities.push({
        id: request._id.toString(),
        type: 'job_requested',
        message: `طلب خدمة جديد: ${request.title}`,
        timestamp: request.createdAt,
        icon: 'FileText',
        color: 'bg-blue-500'
      });
    });

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }
}

export default new AdminService(); 