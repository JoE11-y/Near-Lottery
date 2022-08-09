const GAS = 100000000000000;

export function buyTicket({ noOfTickets, totalAmount }) {
  return window.contract.buyTicket({ noOfTickets }, GAS, totalAmount);
}

export function getPlayerTickets({ playerId, lotteryId }) {
  return window.contract.getPlayerTickets({ playerId, lotteryId });
}

export function getTicketPrice() {
  return window.contract.getTicketPrice();
}

export function getLotteryStatus() {
  return window.contract.getLotteryStatus();
}

export function getLotteryId() {
  return window.contract.getLotteryId();
}

export function getLottery(id) {
  return window.contract.getLottery({ id });
}

//Admin functions
export function startLottery() {
  return window.contract.startLottery();
}

export function getWinningTicket() {
  return window.contract.getWinningTicket();
}

export function payoutWinner() {
  return window.contract.payoutWinner();
}
