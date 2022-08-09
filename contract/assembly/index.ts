import * as lottery from "./model";
import { u128, ContractPromiseBatch, context, logging } from 'near-sdk-as';

// Init function can only be called once.
export function init(operator: string, TICKET_PRICE: u128): void {
    assert(context.predecessor == context.contractName, "Method init is private");
    
    //check if state is already is still in inactive
    assert(lottery.checkState(lottery.State.INACTIVE), "Lottery already initiated");
    
    // set lottery operator
    lottery.set_operator(operator);

    // set ticket price
    lottery.set_ticket_price(TICKET_PRICE);

    // update lottery state to idle
    lottery.setState(lottery.State.IDLE);
    logging.log("Lottery initiated")
}

export function startLottery(): void {
    // check if context is operator
    assert(context.sender == lottery.get_operator(), "Access restricted to lottery operator")
    
    // check if lottery state is set to IDLE
    assert(lottery.checkState(lottery.State.IDLE))
    
    // retrieve lottery id from storage
    var id = lottery.getCurrentLotteryId();
    
    // check if previous lottery was rollovered then update accordingly
    if(lottery.check_rollover()){
        // get lottery
        const _lottery = lottery.getLottery(id);

        // restart lottery
        _lottery.restartLottery();

        // update lottery in storage
        lottery.Lotteries.set(id, _lottery);
    }else{
        // update lottery id by 1
        var newId: i32 = id + 1;

        // start lottery
        lottery.Lotteries.set(newId, lottery.Lottery.startLottery(newId));
        
        // update lottery
        lottery.updateLotteryId(newId);
    }
    
    // update lottery state
    lottery.setState(lottery.State.ACTIVE);
    logging.log("Lottery Started")
}

export function buyTicket(noOfTickets : u32): void {
    // check if lottery state is set to ACTIVE
    assert(lottery.checkState(lottery.State.ACTIVE));

    // get ticket price and calc how much to be spent to purchase tickets
    const ticketPrice: u128 = getTicketPrice();
    const amountToBePaid = u128.mul(ticketPrice, u128.from(noOfTickets));
    // check if attached deposit is up to that amount
    if (amountToBePaid.toString() != context.attachedDeposit.toString()) {
        throw new Error("Insufficient amount")
    }

    // get lottery
    const id = lottery.getCurrentLotteryId();
    const _lottery = lottery.getLottery(id);

    //initiate ticket purchase
    _lottery.buyTicket(noOfTickets, amountToBePaid);

    //update lottery in storage
    lottery.Lotteries.set(id, _lottery)
}

export function getWinningTicket(): void {
    // check if context is operator
    assert(context.sender == lottery.get_operator(), "Access restricted to lottery operator")
    
    // check if lottery state is set to ACTIVE
    assert(lottery.checkState(lottery.State.ACTIVE))

    // get lottery
    const id = lottery.getCurrentLotteryId();
    const _lottery = lottery.getLottery(id);

    // initiate
    _lottery.getWinningTicket()

    // update lottery in storage
    lottery.Lotteries.set(id, _lottery);

    // update lottery state
    lottery.setState(lottery.State.PAYOUT)
    logging.log("Winning Ticket Gotten")
}

export function payoutWinner(): void {
    // check if context is operator
    assert(context.sender == lottery.get_operator(), "Access restricted to lottery operator")
    
    // check if lottery state is set to PAYOUT
    assert(lottery.checkState(lottery.State.PAYOUT))

    // get lottery
    const id = lottery.getCurrentLotteryId();
    const _lottery = lottery.getLottery(id);

    // initiate
    _lottery.payoutWinner();

    // update lottery in storage
    lottery.Lotteries.set(id, _lottery);

    // update lottery state
    lottery.setState(lottery.State.IDLE);
    logging.log("Payout successful, Lottery Ended")
}

export function getPlayerTickets(playerId: string): i32 {
    //get lottery
    const id = lottery.getCurrentLotteryId()
    // return no of player tickets
    return lottery.getPlayerTickets(id, playerId).value
}

export function getTicketPrice(): u128 {
    return lottery.get_ticket_price();
}

export function updateTicketPrice(newPrice: u128): void {
    // check if context is operator
    assert(context.sender == lottery.get_operator(), "Access restricted to lottery operator")
    
    // check if lottery state is set to IDLE
    assert(lottery.checkState(lottery.State.IDLE))

    lottery.set_ticket_price(newPrice);
}

export function getLotteryStatus(): lottery.State {
    return lottery.getState();
}

export function getLottery(id: i32): lottery.Lottery | null {
    return lottery.Lotteries.get(id);
}

