import { fetchOrders, fetchOrderById, fetchRefundSummaries } from '../fetchOrders'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
    getSupabaseBrowserClient: jest.fn(),
}))

describe('Order Fetching Logic', () => {
    const mockFrom = jest.fn()
    const mockSelect = jest.fn()
    const mockEq = jest.fn()
    const mockOrder = jest.fn()
    const mockMaybeSingle = jest.fn()
    const mockIn = jest.fn()

    const mockSupabase = {
        from: mockFrom,
    }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (getSupabaseBrowserClient as jest.Mock).mockReturnValue(mockSupabase)

        // Setup standard chain
        mockFrom.mockReturnValue({ select: mockSelect })
        mockSelect.mockReturnValue({ eq: mockEq, in: mockIn })
        mockEq.mockReturnValue({ order: mockOrder, maybeSingle: mockMaybeSingle, eq: mockEq }) // Chained eq
        mockOrder.mockReturnValue(Promise.resolve({ data: [], error: null }))
        mockIn.mockReturnValue(Promise.resolve({ data: [], error: null }))
    })

    describe('fetchOrders', () => {
        it('should return empty array if userId is missing', async () => {
            const result = await fetchOrders('')
            expect(result).toEqual([])
            expect(mockFrom).not.toHaveBeenCalled()
        })

        it('should return orders with joined products data', async () => {
            const mockData = [{ id: 'order1' }]
            mockOrder.mockResolvedValue({ data: mockData, error: null })

            const result = await fetchOrders('user123')

            expect(mockFrom).toHaveBeenCalledWith('orders')
            expect(mockSelect).toHaveBeenCalledWith('*, order_items(*, products_belong_to(*))')
            expect(result).toEqual(mockData)
        })

        it('should fallback to simple query if complex query fails', async () => {
            // First call fails
            mockOrder
                .mockResolvedValueOnce({ data: null, error: { message: 'Join failed' } }) // First attempt
                .mockResolvedValueOnce({ data: [{ id: 'fallback' }], error: null }) // Fallback attempt

            const result = await fetchOrders('user123')

            expect(mockFrom).toHaveBeenCalledTimes(2) // Once for complex, once for fallback
            expect(result).toEqual([{ id: 'fallback' }])
        })
    })

    describe('fetchOrderById', () => {
        it('should return null if userId or orderId is missing', async () => {
            expect(await fetchOrderById('', 'order1')).toBeNull()
            expect(await fetchOrderById('user1', '')).toBeNull()
        })

        it('should return order if found', async () => {
            const mockData = { id: 'order1' }
            mockMaybeSingle.mockResolvedValue({ data: mockData, error: null })

            const result = await fetchOrderById('user1', 'order1')
            expect(result).toEqual(mockData)
        })

        it('should throw error if Supabase fails', async () => {
            mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB Error' } })

            await expect(fetchOrderById('user1', 'order1')).rejects.toEqual({ message: 'DB Error' })
        })
    })

    describe('fetchRefundSummaries', () => {
        it('should return empty object if itemIds is empty', async () => {
            const result = await fetchRefundSummaries([])
            expect(result).toEqual({})
        })

        it('should correctly aggregate counts', async () => {
            const mockRefunds = [
                { order_item_id: 'item1', quantity: 2, status: 'approved' },
                { order_item_id: 'item1', quantity: 1, status: 'pending' },
                { order_item_id: 'item2', quantity: 5, status: 'rejected' }
            ]

            // Fix: mockIn should return the promise directly, not nested in mockReturnValue
            mockIn.mockResolvedValue({ data: mockRefunds, error: null })

            const result = await fetchRefundSummaries(['item1', 'item2'])

            expect(result).toEqual({
                item1: { approved: 2, pending: 1, rejected: 0 },
                item2: { approved: 0, pending: 0, rejected: 5 }
            })
        })

        it('should throw error if Supabase fails', async () => {
            mockIn.mockResolvedValue({ data: null, error: { message: 'DB Error' } })

            await expect(fetchRefundSummaries(['item1'])).rejects.toEqual({ message: 'DB Error' })
        })
    })
})
