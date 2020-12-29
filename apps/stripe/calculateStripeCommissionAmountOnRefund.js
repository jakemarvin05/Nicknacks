function calculateStripeCommissionAmountOnRefund(stripeObject) {

    // declare the credit card charges.
    let stripeChargesAMEXOrNonDomestic = parseFloat(process.env.STRIPE_CHARGES_AMEX_OR_NON_DOMESTIC)
    if (isNaN(stripeChargesAMEXOrNonDomestic)) throw new Error('Environment variables `STRIPE_CHARGES_AMEX_OR_NON_DOMESTIC` not defined.')

    let stripeChargesDomesticMasterOrVisa = parseFloat(process.env.STRIPE_CHARGES_DOMESTIC_MASTER_VISA)
    if (isNaN(stripeChargesDomesticMasterOrVisa)) throw new Error('Environment variables `STRIPE_CHARGES_DOMESTIC_MASTER_VISA` not defined.')

    var total = parseInt(D.get(stripeObject, 'data.object.amount'));
    var amountRefunded = parseInt(D.get(stripeObject, 'data.object.amount_refunded'));

    if (isNaN(total) || isNaN(amountRefunded)) throw new Error("CRITICAL: calculateStripeCommissionAmountOnRefund: total or amountRefunded is NaN.");

    var stripeCommissionAmountReturned

    // get country of credit card origin
    var countryOfOrigin = D.get(stripeObject, 'data.object.source.country');
    if (!countryOfOrigin) throw new Error("CRITICAL: calculateStripeCommissionAmountOnRefund: countryOfOrigin is invalid.");

    // get card brand
    var cardBrand = D.get(stripeObject, 'data.object.source.brand');
    if (!cardBrand) throw new Error("CRITICAL: calculateStripeCommissionAmountOnRefund: countryOfOrigin is invalid.");

    // calucate the commission which strip will refund us
    if(countryOfOrigin === null) {
        // this is a weird case where credit card country seem to be null
        // stripe seems to default to the lower charge
        // 2.7% of the amount refunded
        stripeCommissionAmountReturned = calculateCommsReturned(
            total,
            amountRefunded,
            stripeChargesDomesticMasterOrVisa
        )

    } else if (countryOfOrigin !== 'SG' || cardBrand === 'American Express') {

        // international charges or AMEX, so 3.2% of the amount refunded
        stripeCommissionAmountReturned = calculateCommsReturned(
            total,
            amountRefunded,
            stripeChargesAMEXOrNonDomestic
        )
    } else {

        // 2.7% of the amount refunded
        stripeCommissionAmountReturned = calculateCommsReturned(
            total,
            amountRefunded,
            stripeChargesDomesticMasterOrVisa
        )
    }

    // calculate the new stripe commission.
    return stripeCommissionAmountReturned

}

// need to use this method because of rounding error
// to pre-calculate the commission, and round off.
// and based comms to be returned on that.
function calculateCommsReturned (total, amountRefunded, chargeRate) {
    let stripeCommissionAmountNow = (total - amountRefunded) * chargeRate

    // must make sure the rounding only happens after computing the net commission using raw values
    let stripeCommissionAmountReturned = Math.round((total * chargeRate) - stripeCommissionAmountNow)
    // if it is a total refund, additional 0.50 refund of stripe fixed charges
    if (total === amountRefunded) stripeCommissionAmountReturned += 50;
    return stripeCommissionAmountReturned /= 100
}
module.exports = calculateStripeCommissionAmountOnRefund;
