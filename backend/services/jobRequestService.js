import JobRequest from '../models/JobRequest.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { Review } from '../models/index.js';
import userService from './userService.js';

class JobRequestService {
  /**
   * Create a new job request
   * @param {Object} jobRequestData - Job request data
   * @param {string} seekerId - ID of the seeker creating the request
   * @returns {Object} Created job request
   */
  async createJobRequest(jobRequestData, seekerId) {
    try {
      console.log(`[JobRequestService] Creating job request for seeker: ${seekerId}`);
      
      // Verify seeker exists and is a seeker
      const seeker = await User.findById(seekerId);
      if (!seeker) {
        console.error(`[JobRequestService] Seeker not found: ${seekerId}`);
        throw new Error('Seeker not found');
      }
      
      // Allow both seekers and providers to create job requests (for development/testing)
      if (!seeker.roles || !seeker.roles.some(r => r === 'seeker' || r === 'provider')) {
        console.error(`[JobRequestService] User ${seekerId} is not a seeker or provider. Roles: ${seeker.roles}`);
        throw new Error('Only seekers or providers can create job requests');
      }

      console.log(`[JobRequestService] Seeker validation passed for: ${seekerId}`);

      // Verify category exists and is active
      const category = await Category.findOne({ name: jobRequestData.category, isActive: true });
      if (!category) {
        console.error(`[JobRequestService] Category not found or inactive: ${jobRequestData.category}`);
        throw new Error('Category does not exist or is not active');
      }

      console.log(`[JobRequestService] Category validation passed: ${jobRequestData.category}`);

      // Validate budget
      if (jobRequestData.budget.min > jobRequestData.budget.max) {
        console.error(`[JobRequestService] Invalid budget range: min=${jobRequestData.budget.min}, max=${jobRequestData.budget.max}`);
        throw new Error('Minimum budget cannot be greater than maximum budget');
      }

      // Validate deadline is in the future
      const deadline = new Date(jobRequestData.deadline);
      if (deadline <= new Date()) {
        console.error(`[JobRequestService] Invalid deadline: ${deadline}`);
        throw new Error('Deadline must be in the future');
      }

      const jobRequest = new JobRequest({
        ...jobRequestData,
        seeker: seekerId,
        status: 'open'
      });

      await jobRequest.save();
      console.log(`[JobRequestService] Job request created successfully: ${jobRequest._id}`);

      // Populate seeker information
      await jobRequest.populate('seeker', 'name email avatarUrl createdAt');

      return jobRequest;
    } catch (error) {
      console.error(`[JobRequestService] Error creating job request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all job requests with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Object} Object with job requests and total count
   */
  async getAllJobRequests(filters = {}, pagination = {}) {
    try {
      const {
        category,
        status,
        minBudget,
        maxBudget,
        lat,
        lng,
        radius,
        search,
        page = 1,
        limit = 20
      } = filters;

      let query = {};

      // Category filter
      if (category) {
        query.category = category;
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Budget filters
      if (minBudget !== undefined) {
        query['budget.max'] = { $gte: minBudget };
      }
      if (maxBudget !== undefined) {
        query['budget.min'] = { $lte: maxBudget };
      }

      // Search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Geo-spatial filter
      if (lat && lng && radius) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseInt(radius)
          }
        };
      }

      const skip = (page - 1) * limit;

      const [jobRequests, totalCount] = await Promise.all([
        JobRequest.find(query)
          .populate('seeker', 'name email avatarUrl isPremium createdAt')
          .populate('assignedTo', 'name email avatarUrl')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        JobRequest.countDocuments(query)
      ]);

      return {
        jobRequests,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get job request by ID
   * @param {string} jobRequestId - Job request ID
   * @returns {Object} Job request object
   */
  async getJobRequestById(jobRequestId) {
    try {
      const jobRequest = await JobRequest.findById(jobRequestId)
        .populate('seeker', 'name email avatarUrl profile createdAt')
        .populate('assignedTo', 'name email avatarUrl profile');

      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      return jobRequest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update job request
   * @param {string} jobRequestId - Job request ID
   * @param {Object} updateData - Update data
   * @param {string} userId - ID of the user making the update
   * @returns {Object} Updated job request
   */
  async updateJobRequest(jobRequestId, updateData, userId) {
    try {
      const jobRequest = await JobRequest.findById(jobRequestId);
      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      // Check if user is authorized to update this job request
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only seeker who created the request or admin can update
      if (jobRequest.seeker.toString() !== userId && !user.roles.includes('admin')) {
        throw new Error('Not authorized to update this job request');
      }

      // If status is being changed to assigned, ensure assignedTo is provided
      if (updateData.status === 'assigned' && !updateData.assignedTo) {
        throw new Error('Provider must be assigned when status is set to assigned');
      }

      // If assignedTo is being set, verify it's a provider
      if (updateData.assignedTo) {
        const assignedUser = await User.findById(updateData.assignedTo);
        if (!assignedUser || !assignedUser.roles.includes('provider')) {
          throw new Error('Assigned user must be a provider');
        }
      }

      // Validate category if being updated
      if (updateData.category) {
        const category = await Category.findOne({ name: updateData.category, isActive: true });
        if (!category) {
          throw new Error('Category does not exist or is not active');
        }
      }

      // Validate budget if being updated
      if (updateData.budget) {
        if (updateData.budget.min > updateData.budget.max) {
          throw new Error('Minimum budget cannot be greater than maximum budget');
        }
      }

      // Validate deadline if being updated
      if (updateData.deadline) {
        const deadline = new Date(updateData.deadline);
        if (deadline <= new Date()) {
          throw new Error('Deadline must be in the future');
        }
      }

      const updatedJobRequest = await JobRequest.findByIdAndUpdate(
        jobRequestId,
        updateData,
        { new: true, runValidators: true }
      ).populate('seeker', 'name email avatarUrl createdAt')
       .populate('assignedTo', 'name email avatarUrl');

      return updatedJobRequest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete job request
   * @param {string} jobRequestId - Job request ID
   * @param {string} userId - ID of the user making the delete request
   * @returns {boolean} Success status
   */
  async deleteJobRequest(jobRequestId, userId) {
    try {
      const jobRequest = await JobRequest.findById(jobRequestId);
      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      // Check if user is authorized to delete this job request
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only seeker who created the request or admin can delete
      if (jobRequest.seeker.toString() !== userId && !user.roles.includes('admin')) {
        throw new Error('Not authorized to delete this job request');
      }

      // Only allow deletion if status is 'open'
      if (jobRequest.status !== 'open') {
        throw new Error('Can only delete job requests with open status');
      }

      await JobRequest.findByIdAndDelete(jobRequestId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get job requests by seeker
   * @param {string} seekerId - Seeker ID
   * @param {Object} filters - Filter options
   * @returns {Array} Array of job requests
   */
  async getJobRequestsBySeeker(seekerId, filters = {}) {
    try {
      const { status, page = 1, limit = 20 } = filters;
      
      let query = { seeker: seekerId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [jobRequests, totalCount] = await Promise.all([
        JobRequest.find(query)
          .populate('assignedTo', 'name email avatarUrl')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        JobRequest.countDocuments(query)
      ]);

      return {
        jobRequests,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers for a specific job request
   * @param {string} jobRequestId - Job request ID
   * @param {string} userId - ID of the user requesting offers
   * @param {Object} filters - Filter options
   * @returns {Array} Array of offers
   */
  async getOffersForJobRequest(jobRequestId, userId, filters = {}) {
    try {
      // Verify job request exists
      const jobRequest = await JobRequest.findById(jobRequestId)
        .populate('seeker', 'name email avatarUrl createdAt');
      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      // Check if user is authorized to view offers
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only job request owner or admin can view offers
      // if (jobRequest.seeker._id.toString() !== userId.toString() && !user.roles.includes('admin')) {
      //   throw new Error('Not authorized to view offers for this job request');
      // }

      // Use offerService to get offers with proper population
      const offerService = (await import('./offerService.js')).default;
      const offers = await offerService.getOffersByJobRequest(jobRequestId, filters);

      // Ensure jobRequestId is present in each offer object
      const mappedOffers = offers.map(offer => ({
        ...offer.toObject(),
        jobRequestId: jobRequestId.toString(),
      }));

      return mappedOffers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign an offer to a job request
   * @param {string} jobRequestId - Job request ID
   * @param {string} offerId - Offer ID
   * @param {string} seekerId - ID of the seeker assigning the offer
   * @returns {Object} Updated job request and offer
   */
  async assignOfferToJobRequest(jobRequestId, offerId, seekerId) {
    try {
      // Verify job request exists and belongs to seeker
      const jobRequest = await JobRequest.findById(jobRequestId);
      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      if (jobRequest.seeker.toString() !== seekerId) {
        throw new Error('Not authorized to assign offers to this job request');
      }

      if (jobRequest.status !== 'open') {
        throw new Error('Job request is not open for assignment');
      }

      // Import Offer model
      const Offer = (await import('../models/Offer.js')).default;

      // Verify offer exists and belongs to this job request
      const offer = await Offer.findById(offerId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      if (offer.jobRequest.toString() !== jobRequestId) {
        throw new Error('Offer does not belong to this job request');
      }

      if (offer.status !== 'pending') {
        throw new Error('Offer is not pending');
      }

      // Update offer status to accepted
      offer.status = 'accepted';
      await offer.save();

      // Update job request status and assign provider
      jobRequest.status = 'assigned';
      jobRequest.assignedTo = offer.provider;
      await jobRequest.save();

      // Reject all other pending offers for this job request
      await Offer.updateMany(
        { 
          jobRequest: jobRequestId, 
          _id: { $ne: offerId }, 
          status: 'pending' 
        },
        { status: 'rejected' }
      );

      // Populate the updated job request
      await jobRequest.populate('assignedTo', 'name email avatarUrl');
      await offer.populate('provider', 'name email phone');

      return {
        jobRequest,
        assignedOffer: offer
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete a job request
   * @param {string} jobRequestId - Job request ID
   * @param {string} providerId - ID of the provider completing the job
   * @param {Object} completionData - Completion data
   * @returns {Object} Updated job request
   */
  async completeJobRequest(jobRequestId, providerId, completionData) {
    try {
      // Verify job request exists
      const jobRequest = await JobRequest.findById(jobRequestId);
      if (!jobRequest) {
        throw new Error('Job request not found');
      }

      // Check if job request is assigned
      if (jobRequest.status !== 'assigned') {
        throw new Error('Job request is not assigned');
      }

      // Check if provider is the assigned provider
      if (jobRequest.assignedTo.toString() !== providerId) {
        throw new Error('You are not the assigned provider for this job request');
      }

      // Update job request with completion data
      jobRequest.status = 'completed';
      jobRequest.completionProof = {
        images: completionData.proofImages || [],
        description: completionData.description || '',
        completedAt: new Date()
      };

      await jobRequest.save();

      // Populate the updated job request
      await jobRequest.populate('assignedTo', 'name email avatarUrl');

      return jobRequest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit a review for a job request
   * @param {string} jobRequestId - Job request ID
   * @param {string} reviewerId - User submitting the review
   * @param {Object} reviewData - { rating, comment }
   * @returns {Object} Created review
   */
  async submitReviewForJobRequest(jobRequestId, reviewerId, reviewData) {
    // Fetch job request
    const jobRequest = await JobRequest.findById(jobRequestId).populate('seeker assignedTo');
    if (!jobRequest) throw new Error('Job request not found');
    if (jobRequest.status !== 'completed') throw new Error('Job must be completed to review');

    // Determine roles
    const isSeeker = reviewerId.toString() === jobRequest.seeker._id.toString();
    const isProvider = jobRequest.assignedTo && reviewerId.toString() === jobRequest.assignedTo._id.toString();
    if (!isSeeker && !isProvider) throw new Error('Only participants can review');

    // Seeker reviews provider
    if (isSeeker) {
      // Only if provider completed the job
      if (!jobRequest.assignedTo) throw new Error('No provider assigned');
      // Check if review already exists
      const existing = await Review.findOne({ reviewer: reviewerId, reviewedUser: jobRequest.assignedTo._id, jobRequest: jobRequestId });
      if (existing) throw new Error('You have already reviewed this provider for this job');
      // Create review
      const review = await Review.create({
        reviewer: reviewerId,
        reviewedUser: jobRequest.assignedTo._id,
        jobRequest: jobRequestId,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      await userService.updateUserRatingAndReviewCount(jobRequest.assignedTo._id);
      return review;
    }
    // Provider reviews seeker
    if (isProvider) {
      // Only if seeker accepted and completed the job
      // (job is completed, so this is true)
      const existing = await Review.findOne({ reviewer: reviewerId, reviewedUser: jobRequest.seeker._id, jobRequest: jobRequestId });
      if (existing) throw new Error('You have already reviewed this seeker for this job');
      const review = await Review.create({
        reviewer: reviewerId,
        reviewedUser: jobRequest.seeker._id,
        jobRequest: jobRequestId,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      await userService.updateUserRatingAndReviewCount(jobRequest.seeker._id);
      return review;
    }
    throw new Error('Invalid review submission');
  }

  // Get targeted leads for a premium provider
  async getTargetedLeadsForProvider(providerId, filters = {}) {
    const provider = await User.findById(providerId);
    if (!provider || !provider.roles.includes('provider') || !provider.isPremium) {
      // Only premium providers can access targeted leads
      return [];
    }
    // Build query based on provider's skills/location and filters
    const query = { status: 'open' };
    if (provider.providerProfile && provider.providerProfile.skills && provider.providerProfile.skills.length > 0) {
      query.requiredSkills = { $in: provider.providerProfile.skills };
    }
    if (filters.minBudget) {
      query['budget.max'] = { $gte: filters.minBudget };
    }
    if (filters.maxBudget) {
      query['budget.min'] = { $lte: filters.maxBudget };
    }
    if (filters.location) {
      query['location.government'] = filters.location.government;
      if (filters.location.city) {
        query['location.city'] = filters.location.city;
      }
    }
    // Add more filters as needed
    const jobRequests = await JobRequest.find(query)
      .populate('seeker', 'name email avatarUrl isPremium createdAt')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 20);
    return jobRequests;
  }
}

export default new JobRequestService(); 