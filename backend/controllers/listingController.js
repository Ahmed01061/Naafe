import ServiceListing from '../models/ServiceListing.js';
import { logger } from '../middlewares/logging.middleware.js';

class ListingController {
  /**
   * List current provider's service listings
   * GET /api/users/me/listings
   */
  async listOwnListings(req, res) {
    try {
      const providerId = req.user._id;
      const { status = 'active', page = 1, limit = 20 } = req.query;
      const query = { provider: providerId };
      if (status) query.status = status;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [listings, totalCount] = await Promise.all([
        ServiceListing.find(query)
          .populate('provider', 'name avatarUrl isPremium isTopRated isVerified totalJobsCompleted providerProfile')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ServiceListing.countDocuments(query)
      ]);
      res.status(200).json({
        success: true,
        data: {
          listings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: parseInt(page) * parseInt(limit) < totalCount,
            hasPrev: parseInt(page) > 1
          }
        },
        message: 'Listings retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`List own listings error: ${error.message}`);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Create a new service listing
   * POST /api/listings
   */
  async createListing(req, res) {
    try {
      const providerId = req.user._id;
      const data = { ...req.body, provider: providerId };
      const listing = new ServiceListing(data);
      await listing.save();
      res.status(201).json({
        success: true,
        data: { listing },
        message: 'Listing created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Create listing error: ${error.message}`);
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Get a single listing by ID
   * GET /api/listings/:id
   */
  async getListingById(req, res) {
    try {
      const { id } = req.params;
      const listing = await ServiceListing.findById(id);
      if (!listing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' }, timestamp: new Date().toISOString() });
      }
      res.status(200).json({
        success: true,
        data: { listing },
        message: 'Listing retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Get listing by ID error: ${error.message}`);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Update own listing
   * PATCH /api/listings/:id
   */
  async updateListing(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user._id;
      const listing = await ServiceListing.findOneAndUpdate(
        { _id: id, provider: providerId },
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!listing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found or not owned by user' }, timestamp: new Date().toISOString() });
      }
      res.status(200).json({
        success: true,
        data: { listing },
        message: 'Listing updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Update listing error: ${error.message}`);
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Delete (archive) own listing
   * DELETE /api/listings/:id
   */
  async deleteListing(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user._id;
      const listing = await ServiceListing.findOneAndUpdate(
        { _id: id, provider: providerId },
        { $set: { status: 'archived' } },
        { new: true }
      );
      if (!listing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found or not owned by user' }, timestamp: new Date().toISOString() });
      }
      res.status(200).json({
        success: true,
        data: { listing },
        message: 'Listing archived successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Delete listing error: ${error.message}`);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Get all listings (public, with search/filter)
   * GET /api/listings
   */
  async getAllListings(req, res) {
    try {
      const {
        category,
        status,
        minPrice,
        maxPrice,
        provider,
        search,
        premiumOnly,
        page = 1,
        limit = 20
      } = req.query;
      const query = {};
      if (category) query.category = category;
      if (status) query.status = status;
      if (provider) query.provider = provider;
      if (minPrice || maxPrice) {
        query['price.amount'] = {};
        if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
        if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (premiumOnly === 'true') {
        // Use aggregation to filter by premium providers
        const pipeline = [
          { $match: query },
          {
            $lookup: {
              from: 'users',
              localField: 'provider',
              foreignField: '_id',
              as: 'providerData'
            }
          },
          { $unwind: '$providerData' },
          { $match: { 'providerData.isPremium': true } },
          {
            $addFields: {
              provider: '$providerData'
            }
          },
          { $project: { providerData: 0, 'provider.password': 0 } },
          { $sort: { createdAt: -1 } },
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) }
        ];
        
        const [listings, totalCountResult] = await Promise.all([
          ServiceListing.aggregate(pipeline),
          ServiceListing.aggregate([
            { $match: query },
            {
              $lookup: {
                from: 'users',
                localField: 'provider',
                foreignField: '_id',
                as: 'providerData'
              }
            },
            { $unwind: '$providerData' },
            { $match: { 'providerData.isPremium': true } },
            { $count: 'total' }
          ])
        ]);
        
        const totalCount = totalCountResult[0]?.total || 0;
        
        res.status(200).json({
          success: true,
          data: {
            listings,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              totalCount,
              totalPages: Math.ceil(totalCount / limit),
              hasNext: parseInt(page) * parseInt(limit) < totalCount,
              hasPrev: parseInt(page) > 1
            }
          },
          message: 'Listings retrieved successfully',
          timestamp: new Date().toISOString()
        });
        return;
      }
      // Custom logic: Reserve first 5 results for premium providers, then append free providers
      // 1. Find all matching listings, populate provider
      const allListings = await ServiceListing.find(query)
        .populate('provider', 'name avatarUrl isPremium isTopRated isVerified totalJobsCompleted providerProfile roles')
        .sort({ createdAt: -1 });
      // 2. Separate premium and free providers
      const premiumListings = allListings.filter(l => l.provider && l.provider.isPremium);
      const freeListings = allListings.filter(l => !l.provider || !l.provider.isPremium);
      // 3. Take up to 5 premium listings for the top
      const featuredPremium = premiumListings.slice(0, 5).map(l => ({ ...l.toObject(), featured: true }));
      // 4. Remaining listings (premium after 5 + all free)
      const restPremium = premiumListings.slice(5).map(l => ({ ...l.toObject(), featured: false }));
      const restFree = freeListings.map(l => ({ ...l.toObject(), featured: false }));
      // 5. Combine for final result
      const combined = [...featuredPremium, ...restPremium, ...restFree];
      // 6. Paginate
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginated = combined.slice(skip, skip + parseInt(limit));
      // 7. Response
      res.status(200).json({
        success: true,
        data: {
          listings: paginated,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount: combined.length,
            totalPages: Math.ceil(combined.length / limit),
            hasNext: parseInt(page) * parseInt(limit) < combined.length,
            hasPrev: parseInt(page) > 1
          }
        },
        message: 'Listings retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Get all listings error: ${error.message}`);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
    }
  }
}

export default new ListingController(); 