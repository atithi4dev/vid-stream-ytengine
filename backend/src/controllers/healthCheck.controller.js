import { ApiResponse } from '../utils/api-utils/ApiResponse.js';
import { asyncHandler } from '../utils/api-utils/asyncHandler.js';

const healthCheck = asyncHandler( async (req, res) => {
     return res.status(200).json(new ApiResponse(200, { status: 'OK' }, 'Health check successful'));
})

export { healthCheck };