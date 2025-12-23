import { fetchProducts } from '../fetchProducts'

// Mock global fetch
global.fetch = jest.fn()

describe('fetchProducts', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should call API with correct parameters', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ products: [] }),
        })

        await fetchProducts({ category: 'shoes', search: 'nike', sort: 'price' })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/products?category=shoes&search=nike&sort=price')
        )
    })

    it('should transform API response correctly', async () => {
        const mockApiProduct = {
            pid: 123,
            name: 'Test Product',
            stock_quantity: 10,
            image_url: null
        }

            ; (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ products: [mockApiProduct] }),
            })

        const result = await fetchProducts()

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            id: '123', // transformed from pid
            stock: 10, // transformed from stock_quantity
            image_url: '/placeholder.svg' // default value
        })
    })

    it('should throw error if fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: 'Internal Server Error'
        })

        await expect(fetchProducts()).rejects.toThrow('Failed to fetch products')
    })
})
