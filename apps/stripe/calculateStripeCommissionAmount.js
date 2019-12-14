'use strict'

const debug = require('debug')('nn:stripe:calculateStripeCommissionAmount')
debug.log = console.log.bind(console)

function calculateStripeCommissionAmount(charge) {

    debug('calculateStripeCommissionAmount:')
    debug(charge)

    let creditCardOriginCountry = D.get(charge, 'data.data.object.source.country')
    let creditCardIsAMEXorIsNotSG = (D.get(charge, 'data.data.object.source.country') !== 'SG' || D.get(charge, 'data.data.object.source.brand') === 'American Express')

    var amount = (function(charge) {
        if (typeof charge.data.data.object.amount === "undefined") {
            let error = new Error('CRITICAL: Stripe charge missing `amount`.')
            throw error
        }

        // stripe amount is in cents. need to divide by 100;
        return parseInt(charge.data.data.object.amount)/100;
    })(charge)

    amount = parseFloat(amount)

    if (isNaN(amount)) throw new Error('`totalAmount` is NaN')

    // declare the credit card charges.
    let stripeChargesAMEXOrNonDomestic = parseFloat(process.env.STRIPE_CHARGES_AMEX_OR_NON_DOMESTIC)
    if (isNaN(stripeChargesAMEXOrNonDomestic)) throw new Error('Environment variables `STRIPE_CHARGES_AMEX_OR_NON_DOMESTIC` not defined.')

    let stripeChargesDomesticMasterOrVisa = parseFloat(process.env.STRIPE_CHARGES_DOMESTIC_MASTER_VISA)
    if (isNaN(stripeChargesDomesticMasterOrVisa)) throw new Error('Environment variables `STRIPE_CHARGES_DOMESTIC_MASTER_VISA` not defined.')

    var stripeCommission

    if(creditCardOriginCountry === null) {
        // this is a weird case where credit card country seem to be null
        // stripe seems to default to the lower charge
        stripeCommission = Math.round(amount * 100 * parseFloat(stripeChargesDomesticMasterOrVisa))/100;

    } else if (creditCardIsAMEXorIsNotSG) {
        stripeCommission = Math.round(amount * 100 * parseFloat(stripeChargesAMEXOrNonDomestic))/100;
    } else {
        stripeCommission = Math.round(amount * 100 * parseFloat(stripeChargesDomesticMasterOrVisa))/100;
    }

    // add the 50 cent
    stripeCommission += 0.50;

    // calculate the new stripe commission.
    return stripeCommission

}

module.exports = calculateStripeCommissionAmount;
