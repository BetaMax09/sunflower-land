import React, { useContext, useState } from "react";
import { useActor, useInterpret } from "@xstate/react";

import { Context } from "features/game/GameProvider";
import { GRID_WIDTH_PX, PIXEL_SCALE } from "features/game/lib/constants";

import { Modal } from "react-bootstrap";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";
import { SUNNYSIDE } from "assets/sunnyside";
import { Revealing } from "features/game/components/Revealing";
import { Revealed } from "features/game/components/Revealed";
import { rewardChestMachine } from "./rewardChestMachine";
import { Button } from "components/ui/Button";
import { Panel } from "components/ui/Panel";
import { getBumpkinLevel } from "features/game/lib/level";
import { Loading } from "features/auth/components";
import { CountdownLabel } from "components/ui/CountdownLabel";
import { Equipped } from "features/game/types/bumpkin";

export const DailyReward: React.FC = () => {
  const { gameService } = useContext(Context);
  const [gameState] = useActor(gameService);

  const isGuest = gameState.matches("playingGuestGame");

  const [showModal, setShowModal] = useState(false);

  const chestService = useInterpret(rewardChestMachine, {
    context: {
      lastUsedCode: gameState.context.state.dailyRewards?.chest?.code ?? 0,
      openedAt: gameState.context.state.dailyRewards?.chest?.collectedAt ?? 0,
      bumpkinLevel: getBumpkinLevel(
        gameState.context.state.bumpkin?.experience ?? 0
      ),
    },
  });

  const [chestState] = useActor(chestService);

  const openModal = () => {
    setShowModal(true);
    chestService.send("LOAD");
  };

  const onUpgrade = () => {
    gameService.send("UPGRADE");
    setShowModal(true);
  };

  const reveal = () => {
    gameService.send("REVEAL", {
      event: {
        type: "dailyReward.collected",
        createdAt: new Date(),
        code: chestState.context.code,
      },
    });
    chestService.send("OPEN");
  };

  const pirateBumpkin: Equipped = {
    body: "Goblin Potion",
    hair: "White Long Hair",
    hat: "Pirate Hat",
    shirt: "Fancy Top",
    pants: "Pirate Pants",
    tool: "Pirate Scimitar",
    background: "Seashore Background",
    shoes: "Black Farmer Boots",
  };

  const ModalContent = () => {
    if (isGuest) {
      return (
        <CloseButtonPanel
          title="Daily Reward"
          onClose={() => setShowModal(false)}
          bumpkinParts={pirateBumpkin}
        >
          <>
            <div className="flex flex-col items-center p-2 pt-0 space-y-2 mb-1 text-sm w-full">
              <img
                src={SUNNYSIDE.decorations.treasure_chest}
                className="mb-2"
                style={{
                  width: `${PIXEL_SCALE * 16}px`,
                }}
              />
              <span>Want to take your farm game to the next level?</span>
              <span>
                Upgrade to a full farm account and unlock all the daily rewards
                waiting for you.
              </span>
            </div>
            <Button onClick={onUpgrade}>Upgrade now!</Button>
          </>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("opened")) {
      const now = new Date();
      const nextRefreshInSeconds =
        24 * 60 * 60 -
        (now.getUTCHours() * 60 * 60 +
          now.getUTCMinutes() * 60 +
          now.getUTCSeconds());

      return (
        <CloseButtonPanel onClose={() => setShowModal(false)}>
          <div className="flex flex-col items-center p-2 w-full">
            <img
              src={SUNNYSIDE.decorations.treasure_chest_opened}
              className="mb-2"
              style={{
                width: `${PIXEL_SCALE * 16}px`,
              }}
            />
            <span className="text-center mb-4">
              Come back later for more rewards
            </span>
            <CountdownLabel timeLeft={nextRefreshInSeconds} />
          </div>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("locked")) {
      return (
        <CloseButtonPanel
          title="Daily Reward"
          onClose={() => setShowModal(false)}
        >
          <div className="flex flex-col items-center p-2">
            <img
              src={SUNNYSIDE.decorations.treasure_chest}
              className="mb-2"
              style={{
                width: `${PIXEL_SCALE * 24}px`,
              }}
            />
          </div>
          <Button onClick={() => chestService.send("UNLOCK")}>
            Unlock Reward
          </Button>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("unlocked")) {
      return (
        <CloseButtonPanel
          title="Daily Reward"
          onClose={() => setShowModal(false)}
        >
          <div className="flex flex-col items-center p-2">
            <img
              src={SUNNYSIDE.decorations.treasure_chest}
              className="mb-2"
              style={{
                width: `${PIXEL_SCALE * 24}px`,
              }}
            />
          </div>
          <Button onClick={reveal}>Open reward</Button>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("error")) {
      return (
        <CloseButtonPanel
          title="Something went wrong!"
          onClose={() => setShowModal(false)}
        >
          <div className="flex flex-col items-center p-2">
            <img
              src={SUNNYSIDE.icons.sad}
              className="mb-2"
              style={{
                width: `${PIXEL_SCALE * 24}px`,
              }}
            />
          </div>
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("comingSoon")) {
      return (
        <CloseButtonPanel title="Oh oh!" onClose={() => setShowModal(false)}>
          <div className="px-2 pb-2 w-full flex flex-col items-center">
            <img src={SUNNYSIDE.icons.player} className="w-1/5 mb-3" />
            <p className="text-sm">
              You must be level 3 to claim daily rewards.
            </p>
          </div>
        </CloseButtonPanel>
      );
    }

    if (chestState.matches("opening") && gameState.matches("revealed")) {
      return (
        <Panel>
          <Revealed onAcknowledged={() => chestService.send("ACKNOWLEDGE")} />
        </Panel>
      );
    }

    if (chestState.matches("opening")) {
      return (
        <Panel>
          <Revealing icon={SUNNYSIDE.icons.treasure} />
        </Panel>
      );
    }

    if (chestState.matches("unlocking")) {
      return (
        <Panel>
          <Loading text="Unlocking" />
        </Panel>
      );
    }

    if (chestState.matches("loading")) {
      return (
        <Panel>
          <Loading />
        </Panel>
      );
    }

    return null;
  };

  return (
    <>
      <div
        className="absolute z-20"
        style={{
          width: `${PIXEL_SCALE * 16}px`,
          height: `${PIXEL_SCALE * 16}px`,
          left: `${GRID_WIDTH_PX * 1.5}px`,
          top: `${GRID_WIDTH_PX * 1}px`,
        }}
      >
        <img
          id="daily-reward"
          src={
            chestState.matches("opened")
              ? SUNNYSIDE.decorations.treasure_chest_opened
              : SUNNYSIDE.decorations.treasure_chest
          }
          className="cursor-pointer hover:img-highlight w-full absolute bottom-0"
          onClick={() => openModal()}
        />
        {!chestState.matches("opened") && (
          <img
            src={SUNNYSIDE.icons.expression_alerted}
            className="absolute animate-float"
            style={{
              width: `${PIXEL_SCALE * 4}px`,
              top: `${PIXEL_SCALE * -14}px`,
              left: `${PIXEL_SCALE * 6}px`,
            }}
          />
        )}
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <ModalContent />
      </Modal>
    </>
  );
};
