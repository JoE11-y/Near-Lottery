import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { utils } from "near-api-js";
import PrevRounds from "./prevRounds";
import BuyTicketForm from "./buyTicketForm";
import Loader from "../ui/Loader";
import { convertTime } from "../../utils";
import { NotificationSuccess, NotificationError } from "../utils/Notifications";
import * as lottery from "../../utils/lottery";

const Lottery = () => {
  const account = window.walletConnection.account();
  const [loading, setLoading] = useState(false);
  const [currlottery, setCurrLottery] = useState({});
  const [prevLottery, setPrevLottery] = useState({});
  const [ticketPrice, setTicketPrice] = useState(0);
  const [playerTickets, setPlayerTicket] = useState(0);
  const [previousLotteryPlayerTickets, setPreviousLotteryPlayerTickets] =
    useState(0);
  const [open, openModal] = useState(false);

  const updateLottery = useCallback(async () => {
    try {
      setLoading(true);
      const lotteryID = await lottery.getLotteryId();
      const playerId = account.accountId;
      if (lotteryID > 1) {
        const prevLotteryID = lotteryID - 1;
        const prevLottery = await lottery.getLottery(prevLotteryID);
        const _playerTickets = await lottery.getPlayerTickets({
          playerId,
          prevLottery,
        });
        setPrevLottery(prevLottery);
        setPreviousLotteryPlayerTickets(_playerTickets);
      }

      const _lottery = await lottery.getLottery(lotteryID);
      const _ticketPrice = await lottery.getTicketPrice();
      const _playerTickets = await lottery.getPlayerTickets({
        playerId,
        lotteryID,
      });
      setPlayerTicket(_playerTickets);
      setCurrLottery(_lottery);
      setTicketPrice(_ticketPrice);
    } catch (e) {
      console.log({ e });
    } finally {
      setLoading(false);
    }
  }, []);

  //  function to initiate transaction
  const buyTicket = async (noOfTickets, totalAmount) => {
    try {
      await lottery
        .buyTicket({
          noOfTickets,
          totalAmount,
        })
        .then((resp) => {
          toast(<NotificationSuccess text="Tickets bought successfully" />);
          updateLottery();
        });
    } catch (error) {
      toast(<NotificationError text="Failed to purchase Ticket" />);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateLottery();
  }, []);

  return (
    <>
      {!loading ? (
        <>
          <div className="container">
            <div className="tabs-container header">
              <div className="tab">Current Lottery</div>
            </div>
            <div className="lottery-container">
              <div className="lottery-header">
                <div>
                  <p>
                    <strong>ID: </strong> {currLottery.ID}
                  </p>
                  <p>
                    <strong>Lottery Ends In: </strong>{" "}
                    {convertTime(currlottery.lotteryEndTime)}
                  </p>
                </div>
              </div>
              <div className="lottery-body">
                <p>
                  <strong>Price Per Ticket: </strong>{" "}
                  {utils.format.formatNearAmount(ticketPrice)} NEAR
                </p>
                <p>
                  <strong>No Of tickets Sold: </strong>
                  {currLottery.noOfTicketsSold}
                </p>
                <p>
                  <strong>Participants: </strong>
                  {currLottery.noOfPlayers}
                </p>
                <p>
                  <strong>Prize: </strong>{" "}
                  {utils.format.formatNearAmount(lottery.amountInLottery / 2)}{" "}
                  NEAR
                </p>
                <p>
                  <strong>Your Tickets: </strong>
                  {playerTickets}
                </p>
              </div>
              <div className="lottery-footer">
                <Button
                  variant="success"
                  className="buy-lottery-btn"
                  onClick={() => openModal(true)}
                >
                  Buy Ticket
                </Button>
              </div>
            </div>
          </div>

          <PrevRounds
            playerId={account.accountId}
            prevLottery={prevLottery}
            ticketPrice={ticketPrice}
            previousLotteryPlayerTickets={previousLotteryPlayerTickets}
          />
        </>
      ) : (
        <Loader />
      )}
      {open && (
        <BuyTicketForm
          ticketPrice={ticketPrice}
          open={open}
          onClose={() => openModal(false)}
          buyTicket={buyTicket}
        />
      )}
    </>
  );
};

export default Lottery;
