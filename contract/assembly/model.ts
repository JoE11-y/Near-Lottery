import {  storage, PersistentUnorderedMap, logging, u128, context, RNG, ContractPromiseBatch } from "near-sdk-core";

@nearBindgen 
class Tickets{
    private _count: i32 = 0;

    public get value(): i32 {
      return this._count
    }

    public set update(value: i32) {
        this._count = value;
    }
  
    constructor(value: i32 = 0) {
      this._count = value
    }
}

@nearBindgen //serializes custom class before storing it on the blockchain
export class Lottery {
    id: i32;
    winner: string;
    noOfTicketsSold: u32;
    noOfPlayers: u32;
    winningTicket: u32;
    amountInLottery: u128;
    lotteryStartTime: u64;
    lotteryEndTime: u64;
    ticketIds: PersistentUnorderedMap<u32, string>; //keeps track of ticketIds to their owners
    playersTickets: PersistentUnorderedMap<string, Tickets>; // keeps track of noOfTickets each player has bought
   
    public static startLottery(id: i32): Lottery { //static method that takses a payload and returns a new Product object
        const lottery = new Lottery();
        lottery.id = id;
        lottery.winner = "";
        lottery.noOfTicketsSold = 0;
        lottery.noOfPlayers = 0;
        lottery.winningTicket = 0;
        lottery.amountInLottery = u128.from(0);
        lottery.lotteryStartTime = context.blockTimestamp;
        lottery.lotteryEndTime = context.blockTimestamp + interval;
        lottery.playersTickets = new PersistentUnorderedMap<string, Tickets>("");
        return lottery;
    }
    
    // if lottery is not valid, we simply just restart that same lottery
    public restartLottery(): void {
        this.lotteryStartTime = context.blockTimestamp;
        this.lotteryEndTime = context.blockTimestamp + interval;
        update_rollover_status(false);
    }

    public buyTicket(noOfTickets: u32, totalAmount: u128): void {  
        //check if lottery has ended
        if(context.blockTimestamp > this.lotteryEndTime){
            throw new Error("Lottery has already ended")
        }

        const playerExistingTickets = getPlayerTickets(this.id, context.predecessor);

        //check if player already has a ticket, else update number of players
        if(!playerExistingTickets){
            this.noOfPlayers = this.noOfPlayers + 1;
        }
        
        //update ticketIds Mapping and their owners;
        const oldTicketCount = this.noOfTicketsSold;
        const newTotal = oldTicketCount + noOfTickets;
        for (let i = oldTicketCount; i < newTotal; i++) {
            this.ticketIds.set(i, context.predecessor)
        }

        //update total no of tickets sold
        this.noOfTicketsSold = this.noOfTicketsSold + noOfTickets;

        // update player ticket mapping
        const newTicketCount = playerExistingTickets.value + noOfTickets;

        playerExistingTickets.update = newTicketCount;

        this.playersTickets.set(context.predecessor, playerExistingTickets);

        // update amount in lottery
        this.amountInLottery = u128.add(this.amountInLottery, totalAmount);
    }

    public getWinningTicket(): void {
        // check if lottery has not ended
        if(context.blockTimestamp < this.lotteryEndTime){
            throw new Error("Lottery has not already ended")
        }

        // check if valid raffle lottery criterias are met
        if(this.noOfTicketsSold < 5 || this.noOfPlayers < 2){
            update_rollover_status(true);
            setState(State.IDLE);
            return
        }

        const ticketID = getRandom() % this.noOfTicketsSold;

        this.winningTicket = ticketID;
        var winner = this.ticketIds.get(ticketID);

        if(winner === null){
            throw new Error("Error in random generator")
        }
        this.winner = winner;
    }

    public payoutWinner(): void {
        const amountForWinner = u128.div(this.amountInLottery, u128.from(2));
        const amountForOwner = u128.div(amountForWinner, u128.from(2));
        ContractPromiseBatch.create(this.winner).transfer(amountForWinner);
        ContractPromiseBatch.create(get_operator()).transfer(amountForOwner);

        //this rest stays in the contract for storage
    }

}

//Lottery mapping
export const Lotteries = new PersistentUnorderedMap<i32, Lottery>("Lotteries");

export function getLottery(id: i32): Lottery {
    const _lottery = Lotteries.get(id);

    if(_lottery === null){
        throw new Error('Invalid lottery ID')
    }

    return _lottery;
}

//2days in nanoseconds
const interval : u32 = (2 * 24 * 60 * 60 * 1000000);

//Lottery states
export enum State {
    INACTIVE,
    IDLE,
    ACTIVE,
    PAYOUT
}

const initialState : State = State.INACTIVE;

export function setState(state: State): void {
    storage.set<State>("lotteryState", state)
}

export function getState(): State {
    if(!storage.contains("lotteryState")) {return initialState}
    return storage.getSome<State>("lotteryState")
}

//Lottery ID

const lotteryId : i32 = 0;

export function updateLotteryId(lotteryId: i32): void {
    storage.set<i32>("id", lotteryId)
}

export function getCurrentLotteryId(): i32 {
    return storage.getPrimitive<i32>("id", lotteryId)
}

//TIcket Pricing
//Default Value
const TICKET_PRICE: u128 = u128.from("1000000000000000000000000");

export function set_ticket_price(price: u128): void {
    storage.set<u128>("price", price)
}

export function get_ticket_price(): u128 {
    if (!storage.contains("price")) { return TICKET_PRICE }
    return storage.getSome<u128>("price")
}


//Set Operator Access
export function set_operator(operator: string): void {
    storage.set<string>("operator", operator)
}

export function get_operator(): string {
    return storage.getPrimitive<string>("operator", "nearpetshop.devfrank.testnet")
}

//Rollover Status
function update_rollover_status(status: bool): void {
    storage.set<bool>('rollover', status )
}
export function check_rollover(): bool {
    return storage.getPrimitive<bool>('rollover', false)
}


//Functions

//Return players existing tickets
export function getPlayerTickets(lotteryID: i32, playerId: string): Tickets {
    const lotteryInstance = Lotteries.get(lotteryID);
    if(lotteryInstance === null){
        throw new Error('Invalid Lottery ID');
    }
    const playersTickets = lotteryInstance.playersTickets

    const playerLotteryTickets = playersTickets.get(playerId);

    if(playerLotteryTickets === null){
        return new Tickets();
    }else{
        return playerLotteryTickets;
    }
}

function getRandom(): u32{
    const rng = new RNG<u32>(1, u32.MAX_VALUE);
    const roll = rng.next();
    logging.log("roll: " + roll.toString());
    return roll
}

export function checkState(state: State): bool {
    const currState: State = getState();

    if(state !== currState){
        throw new Error("current state does not allow this")
    }

    return true;
}



