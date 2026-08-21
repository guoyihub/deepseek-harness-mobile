# DeepSeek Harness

[English](README.md) | 涓枃

DeepSeek Harness锛坄dsh`锛夋槸鐢?[DeepSeek AI](https://deepseek.com) 寮€鍙戠殑寮€婧?agent harness锛堟櫤鑳戒綋妗嗘灦锛夈€?
瀹冮噰鐢?*涓€鍒囩殕鎻掍欢**鐨勬灦鏋勶紝骞剁敱 [Cordis](https://github.com/cordiverse/cordis) 椹卞姩锛屽叾璁捐鍙傝璁烘枃 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)銆?
## 寮€鍙戣€呴瑙?
DeepSeek Harness 鐩墠澶勪簬 _寮€鍙戣€呴瑙坃 闃舵锛屾鍦ㄥ揩閫熻凯浠ｃ€?*鏈潵灏嗗嚭鐜扮牬鍧忓吋瀹规€х殑鍙樻洿銆?*

<a id="run"></a>

## 杩愯

### 閫氳繃 `npm` 杩愯

瀹夎 `Node.js`锛岀劧鍚庤繍琛岋細

```sh
npx @deepseek-ai/dsh web
```

璇ュ懡浠ら粯璁や細鍦?`http://127.0.0.1:3080` 鍚姩 Web UI锛屾湰鏈哄惎鍔ㄦ椂杩樹細鐢ㄩ粯璁ゆ祻瑙堝櫒鎵撳紑椤甸潰銆傞€氳繃 SSH 鍚姩鏃跺彧鎵撳嵃瀹夸富鏈?URL锛屽洜涓烘湰鍦拌浆鍙戝湴鍧€鐢?SSH 瀹㈡埛绔垨缂栬緫鍣ㄦ寔鏈夈€備紶鍏?`--no-open` 鍙粎杩愯鏈嶅姟鍣ㄨ€屼笉鎵撳紑娴忚鍣ㄣ€傝瑙?[Web UI 鎸囧崡](docs/user/guide/index.zh.md)銆?
<a id="run-from-source"></a>

### 浠庢簮鐮佽繍琛?
濡傞渶浠庝粨搴撴簮鐮佽繍琛岋細

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 浼氬噯澶囦粨搴撲骇鐗┿€俙pnpm dsh web` 浼氱洿鎺ヤ娇鐢ㄨ繖浜涘凡鏋勫缓浜х墿锛屼笉浼氶噸鏂版瀯寤恒€?
## 绀惧尯涓庢敮鎸?
- 娆㈣繋閫氳繃 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 鎻愪氦鍙嶉鎴?bug 鎶ュ憡銆?- 涓轰綘鐨勬彃浠朵粨搴撴坊鍔?[`dsh-plugin`](https://github.com/topics/dsh-plugin) 璇濋锛屼究浜庤鍙戠幇銆?- 娆㈣繋鍔犲叆 DeepSeek Harness 浼佸井缇わ細鎵爜娣诲姞浼佸井灏忓姪鎵嬪苟濉啓鍏ョ兢闂嵎锛屽畬鎴愬悗灏忓姪鎵嬩細閭€璇蜂綘鍏ョ兢銆?
<table>
  <thead>
    <tr>
      <th align="center">浼佸井灏忓姪鎵?/th>
      <th align="center">鍏ョ兢闂嵎</th>
      <th align="center">寰俊鍏紬鍙?/th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-assistant.png" alt="DeepSeek Harness 浼佸井灏忓姪鎵嬩簩缁寸爜" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-survey.png" alt="DeepSeek Harness 鍏ョ兢闂嵎浜岀淮鐮? width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wechat-official-account.png" alt="DeepSeek Harness 鍥㈤槦寰俊鍏紬鍙蜂簩缁寸爜" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 鍙備笌璐＄尞

鍙傝 [CONTRIBUTING.md](CONTRIBUTING.zh.md)銆?
## 寮€鍙?
璇峰厛闃呰[寮€鍙戞寚鍗梋(docs/development.zh.md)涓嶽鏋舵瀯鏂囨。](docs/architecture.zh.md)銆?
闈㈠悜 agent锛氳閬靛惊 [AGENTS.md](AGENTS.md)銆?
## 璁稿彲璇?
[MIT](LICENSE)

绗笁鏂逛緷璧栧強鍏惰鍙瘉瑙?[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)銆?
