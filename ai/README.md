# SEA Extractor

가상 기항문서의 **슬롯 추출**입니다. GPT를 학습하지 않으며, 선사 실메일을 쓰지 않습니다.

학습 코드는 `ai/`에 있고, React 앱은 내보낸 가중치만 읽습니다.

```
python ai/train.py      # train + val 선택. test 미사용
python ai/evaluate.py   # test_id / test_ood 1회
python ai/inference.py --text "..." --mode hybrid
python ai/ops_experiments.py   # 규칙 민감도 히트맵. 위험 확률 아님
```

노트북: `ai/ops_experiments.ipynb` (Colab에서 열면 히트맵을 볼 수 있다). 엔진 원본은 `src/clocks.ts` / `src/experiments.ts`.

## 모델이 실제로 학습하는 것

Collins 스타일 **linear-chain averaged perceptron** (BIO).

- parameter: emit `label\\tfeature`, transition `TR\\tprev|lab`
- 손실: 미분 가능한 cross-entropy가 아님. 골드 경로 +1, 예측 경로 −1
- 갱신은 `gold != pred`일 때 실제로 발생 (에폭1 시퀀스 갱신 466 → 에폭6 157)
- 자질에 gazetteer·정규식 힌트가 들어가 있어 **ML + heuristic feature**이다
- 항구 정규화 등 디코드 후처리는 규칙

## protocol v2 (믿을 수 있게 만든 실험)

- train 1600 / val 200 / test_id / test_ood
- test는 학습 루프에 안 넣음
- best checkpoint = val micro F1 최대 (에폭 2, 91.3)
- ID = 학습에 쓴 템플릿 패밀리의 새 문장
- OOD = 학습에 안 넣은 템플릿 (`pls update`, `IMO … Discard T2`, `내륙 참고`)

Frozen v1 (동일 템플릿, 에폭마다 test 측정): 디코이 SEA 필드일치 95.6 / 규칙 53.6. **일반화로 쓰지 않음.**

## 최종 test (synthetic, 1회)

| 분할 | 규칙 match / micro F1 | SEA match / micro F1 | 하이브리드 match / micro F1 | n |
|---|---|---|---|---|
| ID easy | 84.3 / 77.6 | 84.1 / 85.9 | 84.2 / 77.5 | 150 |
| ID hard | 47.2 / 55.1 | 97.5 / 97.5 | 97.5 / 91.5 | 250 |
| OOD easy | 83.3 / 79.5 | 77.9 / 80.8 | 85.0 / 78.5 | 80 |
| **OOD hard** | **68.7 / 73.3** | **76.2 / 80.5** | **82.4 / 76.9** | 200 |

OOD hard 부두: 규칙 200/200, SEA 134/200 (F1 67.0). `Discard T2`가 문장 끝에 오면 퍼셉트론이 디코이를 집는다. 학습 템플릿은 `CANCEL T2`가 앞에 있었다.

Safety (OOD hard, SEA, 합성 플래그): Cut-off 환각 0/200. 부두 오추출 66/200. 상용 실패율 0%가 아님.

시드 11건은 smoke: 규칙 38/38, 하이브리드 34/38, SEA 31/38. drift는 규칙 0/11, SEA·하이브리드 2/11 (NURI, B).

## 왜 지금 BERT를 안 넣었나

OOD에서 이미 모델 용량이 아니라 **템플릿 순서 과적합**이 병목이다. 같은 프로토콜로 encoder token-classification을 붙이는 것은 다음 실험이다. 지금 숫자를 올리려고 모델을 바꾸지 않는다.
