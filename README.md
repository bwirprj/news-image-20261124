# 24 November 2026 in one image

An original entry for make.fun's "Sum up 24 November's world news in one image" bounty.

`entry.png` is a 1024x1024 editorial poster naming the day and eight stories reported on 24 November 2026: Jensen Huang's reinstatement as Nvidia CEO and the market rally, Ukrainian sea drones against the Merkury and Angara, NATO's AWACS deployment to Poland, the end of COP31 without a deal, the Al-Amari refugee camp operation and Oxfam's warning, India's pledge to flood-hit Nepal, cancelled Belgian flights, and the planned US blacklist of Megaspeed. The layout uses a masthead, a labelled globe, six region cards, a technology strip and small-type source notes. Every claim is drawn from the supplied facts for that date.

`main.ts` builds the poster with the Node standard library only. It rasterises a small bitmap font and simple shapes into an RGB buffer, then writes a PNG through a self-contained encoder with CRC32 and zlib. There are no dependencies and no network calls. The output path is `MAKEFUN_OUTPUT_DIR/entry.png`, defaulting to `/output/entry.png`. Two runs with the same environment produce identical bytes.

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/bwirprj/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/bwirprj/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

## Run locally

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22 or later is enough. The program prints the output path, byte count and dimensions.

## Check determinism

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
shasum -a 256 out/entry.png
MAKEFUN_OUTPUT_DIR=out node main.ts
shasum -a 256 out/entry.png
```

Both hashes match. The committed `entry.png` is the same image the program generates.

## License

MIT. See `LICENSE`.

Prepared by @bwirprj.
