<p align="center"><img src="docs/bonepose_logo.png" alt="bonepose" width="560"></p>

HTML ファイル一枚の OpenPose 骨格エディタです。ControlNet 用の 18 点の骨格を描いて PNG で書き出します。サーバーもビルドも外部ライブラリも要りません。`index.html` をブラウザで開く（または下の公開ページを開く）だけで、関節をつまんで動かせます。

**公開ページ:** https://hisashi-ito.github.io/bonepose/ · [English](README.md)

![screenshot](docs/screenshot.png)

書き出した PNG は、OpenPose ControlNet がヒント画像として受け取る形式そのものです（黒地に標準の 18 色の骨格）。[Draw Things CLI の `--pose-image` fork](https://github.com/hisashi-ito/draw-things-community) のために作りましたが、OpenPose ControlNet を使うものなら A1111、ComfyUI、Forge、Draw Things のどれでも使えます。

![export example](docs/export_example.png)

![gallery](docs/gallery.png)

上の段が bonepose で描いた骨格（プリセット。1 枚は両手を付けたもの）、下の段がその骨格から生成した画像です。生成は WAI-illustrious-SDXL v16 と xinsir の OpenPose SDXL ControlNet を diffusers で RTX 4080 上で動かしました（1024 × 1024、25 ステップ、CFG 6、Euler a、seed 777、ControlNet の重み 1.0 を最初の 60 % のステップに適用。プロンプトは「masterpiece, best quality, amazing quality, 1girl, solo, medium hair, brown hair, brown eyes, serafuku, school uniform, <ポーズのタグ>, smile, looking at viewer, full body, simple background」）。同じ骨格 PNG は Draw Things、A1111、Forge、ComfyUI でもそのまま使えます。

## 機能

A1111 や ComfyUI の拡張として使われているエディタの機能を調べ、ファイル一枚に収まる範囲で取り込みました。

| 機能 | 内容 |
|---|---|
| 複数人 | 追加、複製、削除、左右反転。右ドラッグで一人だけ移動 |
| 骨の長さ固定 | 関節をつまむと親の関節を中心に回り、先の関節も一緒に動きます。Alt で長さを変更、Ctrl で角度を 15° 刻みに、首をつまむと全身が移動 |
| 左右対称編集 | 反対側の関節が体の軸をはさんで追従 |
| 手 | 手首に付く 21 点の OpenPose の手。手の配色も OpenPose に合わせています |
| 関節の非表示 | ダブルクリックか Delete。非表示の関節は `0,0,0` で書き出され、つながる骨も描かれません |
| 全身の変形 | 回転、向き（縦軸まわりの回転の近似）、拡大縮小 |
| 下絵 | 写真を重ねてなぞれます。透明度を調整でき、書き出しには含まれません |
| 取り消し・やり直し | Ctrl+Z、Ctrl+Y、200 手まで |
| キャンバスサイズ | 任意。SDXL でよく使う解像度のプリセット付き。サイズ変更時にポーズも一緒に拡縮 |
| OpenPose JSON | ControlNet や sd-webui-openpose-editor と同じ JSON を読み書き（`people[].pose_keypoints_2d` に `x, y, c` の三つ組、`canvas_width`、`canvas_height`）。顔の点は保持して描画 |
| PNG | ダウンロード、またはクリップボードへコピー |
| ライブラリ | ポーズ一式をブラウザ内（localStorage）に保存 |
| プリセット | 直立、T ポーズ、ピース、頬に手、両手上げ、手を振る、歩く、走る、座る |

## 操作

| 入力 | 動作 |
|---|---|
| 関節をドラッグ | 移動（自由モード）、または骨ごと回転（長さ固定モード） |
| Shift + ドラッグ | 全身を移動 |
| 右ドラッグ | カーソル下の人を移動。人がなければ画面の移動 |
| 空白をドラッグ / ホイール | 画面の移動 / 拡大縮小 |
| ダブルクリック | 関節の表示と非表示の切り替え |
| Del · H | 選択中の関節の表示と非表示 |
| 矢印キー | 選択中の関節を 1 px 移動（Shift で 10 px） |
| Ctrl+Z / Ctrl+Y | 取り消し / やり直し |
| Ctrl+D | 選択中の人を複製 |
| L · S · G · F | 長さ固定 · 対称編集 · 格子 · 全体表示 |
| Esc | 選択解除 |

## 関節の番号

OpenPose の COCO-18 の順です。0 鼻、1 首、2〜4 右肩・右肘・右手首、5〜7 左肩・左肘・左手首、8〜10 右腰・右膝・右足首、11〜13 左腰・左膝・左足首、14 右目、15 左目、16 右耳、17 左耳。「右」は被写体から見た右で、被写体が正面を向いていれば画像の左側に来ます。骨の色は ControlNet の OpenPose 前処理と同じ 18 色です。

## 書き出した画像の使い方

Draw Things CLI（`--pose-image` を足した fork）:

```
draw-things-cli generate --model <sdxl_model>.ckpt --pose-image openpose_1024x1024.png \
  --config-json '{"controls":[{"file":"openpose_sdxl_xinsir_ctrl_f16.ckpt","weight":1.0,"guidanceStart":0,"guidanceEnd":0.6,"inputOverride":"pose"}]}' \
  --prompt "..." --output out.png
```

A1111 / Forge: ControlNet のユニットに PNG を入れ、前処理は `none`、モデルは `openpose` を選びます。
ComfyUI: `LoadImage` で PNG を読み、前処理なしで `Apply ControlNet` に OpenPose のモデルとともに渡します。

## 埋め込み

`window.openposeEditor` に小さな API があります。`toJSON()`、`fromJSON(obj)`、`renderPNG()`（canvas を返す）、`state`、`view`、`undo()`、`redo()`。iframe に入れてポーズを取り出す用途にはこれで足ります。

## テスト

`tests/test.js` が擬似的なマウスとキーボードの操作でエディタを動かし、28 項目を検査します（長さ固定、角度の刻み、対称編集、手の追従、取り消しとやり直し、JSON の往復、PNG のサイズなど）。次で実行できます。

```
tests/run.sh
```

手元に `chromium` がなければ、docker の `minlag/mermaid-cli` に入っている Chromium を使います。

## 参考にしたもの

[sd-webui-openpose-editor](https://github.com/huchenlei/sd-webui-openpose-editor)、[openpose-editor](https://github.com/fkunn1326/openpose-editor)、[comfyui-openpose-studio](https://github.com/oosawak/comfyui-openpose-studio)、[Posex](https://github.com/hnmr293/posex) の機能を参考にしました。コードの共有はありません。

## ライセンス

MIT
