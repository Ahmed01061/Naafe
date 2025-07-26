import Offer from '../models/Offer.js';
import User from '../models/User.js';
import JobRequest from '../models/JobRequest.js';

/**
 * GET /api/schedule/:providerId
 * Returns all offers/services for a provider as schedule items
 */
export const getProviderSchedule = async (req, res) => {
  try {
    const { providerId } = req.params;
    // Only allow the provider themselves or an admin to access
    if (req.user._id.toString() !== providerId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }

    // Fetch all offers for this provider
    const offers = await Offer.find({ provider: providerId })
      .populate('jobRequest', 'title seeker')
      .populate('provider', 'name');

    // Map offers to schedule items
    const schedule = offers.map(offer => {
      // Determine status for calendar
      let status = 'pending';
      if (['pending', 'negotiating'].includes(offer.status)) {
        status = 'pending';
      } else if (
        ['agreement_reached', 'accepted', 'in_progress'].includes(offer.status)
        && offer.payment && offer.payment.status === 'escrowed'
      ) {
        status = 'confirmed';
      } else if (offer.status === 'completed') {
        status = 'completed';
      } else if (offer.status === 'cancelled' || offer.status === 'rejected' || offer.status === 'withdrawn') {
        return null; // Don't show cancelled/rejected/withdrawn offers
      }
      // Use scheduledDate/time if available, else fallback to availableDates/timePreferences
      let date = offer.payment?.scheduledDate || (offer.availableDates && offer.availableDates[0]);
      let timeSlot = offer.payment?.scheduledTime || (offer.timePreferences && offer.timePreferences[0]) || 'غير محدد';
      // Get seeker name
      let seekerName = '';
      if (offer.jobRequest && offer.jobRequest.seeker) {
        if (typeof offer.jobRequest.seeker === 'object' && offer.jobRequest.seeker.name) {
          seekerName = offer.jobRequest.seeker.name.first + ' ' + offer.jobRequest.seeker.name.last;
        } else {
          seekerName = 'طالب الخدمة';
        }
      }
      return {
        id: offer._id,
        date: date ? new Date(date).toISOString().slice(0, 10) : '',
        timeSlot,
        status,
        serviceTitle: offer.jobRequest?.title || 'خدمة',
        seekerName,
        location: offer.jobRequest?.location || 'غير محدد',
      };
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      data: { schedule },
      message: 'Schedule retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; 