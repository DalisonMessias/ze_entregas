const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'services', 'cloud.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add validateCoupon after getStreetsByCity
if (!content.includes('export const validateCoupon')) {
    const searchString = 'export const getStreetsByCity = async (state: string, city: string, streetName: string): Promise<any[]> => {';
    const index = content.indexOf(searchString);
    if (index !== -1) {
        // Find end of function
        let openBraces = 0;
        let foundBrace = false;
        let i = index;
        while (i < content.length) {
            if (content[i] === '{') { openBraces++; foundBrace = true; }
            else if (content[i] === '}') { openBraces--; }
            i++;
            if (foundBrace && openBraces === 0) break;
        }

        const insertion = `

// --- PUBLIC ORDER ---
export const validateCoupon = async (
    storeId: string,
    couponCode: string,
    cartTotal: number,
    customerPhone: string
): Promise<{ success: boolean; discount_value?: number; message?: string }> => {
    const sb = getClient();
    if (!sb) return { success: false, message: 'Client not initialized' };

    const { data, error } = await sb.rpc('validate_coupon', {
        p_store_id: storeId,
        p_coupon_code: couponCode,
        p_cart_total: cartTotal,
        p_customer_phone: customerPhone
    });

    if (error) {
        console.error('Error validating coupon:', error);
        return { success: false, message: error.message || 'Erro ao validar cupom' };
    }

    return {
        success: data.success,
        discount_value: data.discount_value,
        message: data.message
    };
};`;
        content = content.slice(0, i) + insertion + content.slice(i);
        console.log('validateCoupon added.');
    } else {
        console.log('Search string for getStreetsByCity not found.');
    }
}

// 2. Update createPublicOrder signature and parameters
if (content.includes('export const createPublicOrder')) {
    // Replace signature
    content = content.replace(
        /export const createPublicOrder = async \(\s*storeId: string,\s*items: any\[\],\s*totalPrice: number,\s*paymentMethod: string,\s*shippingAddress: any,\s*deliveryMode: 'DELIVERY' \| 'PICKUP',\s*customerName: string,\s*customerPhone: string,\s*pixActive: boolean = false,\s*observation: string = '',\s*pointsRedeemed: number = 0,\s*loyaltyDiscountValue: number = 0\s*\)/,
        `export const createPublicOrder = async (
    storeId: string,
    items: any[],
    totalPrice: number,
    paymentMethod: string,
    shippingAddress: any,
    deliveryMode: 'DELIVERY' | 'PICKUP',
    customerName: string,
    customerPhone: string,
    pixActive: boolean = false,
    observation: string = '',
    pointsRedeemed: number = 0,
    loyaltyDiscountValue: number = 0,
    couponCode: string = '',
    couponDiscountValue: number = 0
)`
    );

    // Replace RPC call
    content = content.replace(
        /p_points_redeemed: pointsRedeemed,\s*p_loyalty_discount_value: loyaltyDiscountValue\s*\}\);/,
        `p_points_redeemed: pointsRedeemed,
        p_loyalty_discount_value: loyaltyDiscountValue,
        p_coupon_code: couponCode,
        p_coupon_discount_value: couponDiscountValue
    });`
    );
    console.log('createPublicOrder updated.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done.');
