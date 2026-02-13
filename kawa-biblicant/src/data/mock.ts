import type { LineageEdge, Paper } from "../types";

export const MOCK_RESULTS: Paper[] = [
  {
    title: "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    year: "2023",
    venue: "ACM TOG (SIGGRAPH)",
    relevance: 0.96,
    reason: "3D Gaussian Splatting（3DGS）を確立した中核論文。以後の派生研究の前提になる。",
    pdfUrl: "https://arxiv.org/pdf/2308.04079.pdf",
    imageUrl:
      "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/content/images/comparisons/ours_bicycle.png",
    summary:
      "NeRF系の高品質NVSを“点群 + ガウス楕円体 + 高速ラスタライズ”で置き換え、学習と描画を現実的な速度に引き上げた基盤手法。",
    keywords: [
      "3D Gaussian Splatting",
      "novel view synthesis",
      "radiance field",
      "rasterization",
      "anisotropic gaussian",
      "spherical harmonics"
    ],
    prereqKeywords: [
      "Structure-from-Motion",
      "多視点幾何",
      "点群",
      "ガウシアン分布",
      "differentiable rendering",
      "front-to-back compositing",
      "球面調和関数",
      "最適化",
      "オクルージョン",
      "ラスタライズ"
    ]
  },
  {
    title: "4D Gaussian Splatting for Real-Time Dynamic Scene Rendering",
    year: "2024",
    venue: "CVPR",
    relevance: 0.89,
    reason: "動的シーンへ3DGSを拡張する代表格。『時間』を入れると何が壊れるかがわかる。",
    pdfUrl:
      "https://openaccess.thecvf.com/content/CVPR2024/papers/Wu_4D_Gaussian_Splatting_for_Real-Time_Dynamic_Scene_Rendering_CVPR_2024_paper.pdf",
    imageUrl: "https://guanjunwu.github.io/4dgs/static/images/pipeline_00.jpg",
    summary:
      "静的3DGSを時空間へ拡張し、時間に応じた形状変化や運動を表現して動的シーンをリアルタイム描画する枠組み。",
    keywords: [
      "4D Gaussian Splatting",
      "dynamic scene",
      "spatio-temporal rendering",
      "deformation",
      "real-time"
    ],
    prereqKeywords: [
      "3D Gaussian Splatting",
      "時空間表現",
      "変形場",
      "optical flow",
      "動的NeRF系",
      "正則化（smoothness / temporal consistency）",
      "時間方向のサンプリング/補間",
      "motion blur",
      "トラッキング誤差"
    ]
  },
  {
    title: "Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering",
    year: "2024",
    venue: "CVPR",
    relevance: 0.86,
    reason: "3DGSの“冗長ガウス増殖”に構造で殴り返す。コンパクト化と頑健性の軸が強い。",
    pdfUrl:
      "https://openaccess.thecvf.com/content/CVPR2024/papers/Lu_Scaffold-GS_Structured_3D_Gaussians_for_View-Adaptive_Rendering_CVPR_2024_paper.pdf",
    imageUrl: "https://city-super.github.io/scaffold-gs/static/images/teaser.png",
    summary:
      "アンカー点を核にガウシアン群を構造化し、ビュー依存に適応させつつ冗長性を抑えて高品質な合成を狙う。",
    keywords: [
      "structured gaussians",
      "anchors",
      "view-adaptive rendering",
      "pruning/growing",
      "compactness"
    ],
    prereqKeywords: [
      "3D Gaussian Splatting",
      "クラスタリングの直感",
      "proxy geometry",
      "view-dependent appearance",
      "Level of Detail",
      "冗長性",
      "正則化",
      "近傍探索"
    ]
  },
  {
    title: "Mip-Splatting: Alias-free 3D Gaussian Splatting",
    year: "2024",
    venue: "CVPR",
    relevance: 0.84,
    reason: "ズームやスケール変化で破綻する3DGSの“別の弱点”を正面から潰す。",
    pdfUrl:
      "https://openaccess.thecvf.com/content/CVPR2024/papers/Yu_Mip-Splatting_Alias-free_3D_Gaussian_Splatting_CVPR_2024_paper.pdf",
    imageUrl: "https://niujinshuchong.github.io/mip-splatting/resources/teaser.png",
    summary:
      "スケール変化で発生するエイリアシングを抑えるため、周波数・フィルタリングの観点から3DGSのレンダリング/学習を整える。",
    keywords: [
      "anti-aliasing",
      "mip filter",
      "multi-scale",
      "frequency constraint",
      "alias-free rendering"
    ],
    prereqKeywords: [
      "3D Gaussian Splatting",
      "エイリアシング",
      "ローパスフィルタ",
      "MipMap",
      "アンチエイリアス",
      "スケール不変性",
      "shimmering"
    ]
  },
  {
    title: "Gaussian Splatting SLAM",
    year: "2024",
    venue: "CVPR",
    relevance: 0.82,
    reason: "3DGSを“オンライン推定（SLAM）”に持ち込み、表現と最適化の統合を見せる。",
    pdfUrl:
      "https://openaccess.thecvf.com/content/CVPR2024/papers/Matsuki_Gaussian_Splatting_SLAM_CVPR_2024_paper.pdf",
    imageUrl: "https://rmurai.co.uk/projects/GaussianSplattingSLAM/assets/teapot_rendering.png",
    summary:
      "Gaussiansを地図表現にして、カメラ追跡と地図更新をオンラインに回す。フォトリアル寄りの地図が手に入るのが特徴。",
    keywords: [
      "SLAM",
      "Gaussian map",
      "tracking",
      "online mapping",
      "real-time"
    ],
    prereqKeywords: [
      "SLAM",
      "PnP",
      "再投影誤差",
      "キーフレーム",
      "ICP",
      "photometric loss",
      "ドリフトと安定化",
      "オンライン最適化",
      "微分可能レンダリング"
    ]
  }
];

export const MOCK_MEMO_RESULT: Paper[] = [
    MOCK_RESULTS[0],
    MOCK_RESULTS[3],
    MOCK_RESULTS[4],
  {
    title: "MusicGen: Simple and Controllable Music Generation",
    year: "2023",
    venue: "NeurIPS (paper on arXiv)",
    relevance: 0.95,
    reason:
      "テキスト（＋任意でメロディ）から高品質音楽を生成する実用系の代表格。オープン実装・モデル公開が強い。",
    pdfUrl: "https://arxiv.org/pdf/2306.05284.pdf",
    imageUrl: "https://musicgen.com/",
    summary:
      "ニューラル音声コーデック（EnCodec）で波形を離散トークン化し、自己回帰Transformerで音楽トークン列を生成する。条件（テキスト/メロディ等）を扱いやすい形で統合し、品質と操作性のバランスを取った。",
    keywords: [
      "text-to-music",
      "audio tokens",
      "EnCodec",
      "autoregressive transformer",
      "controllable generation",
      "melody conditioning"
    ],
    prereqKeywords: [
      "Transformer（自己回帰生成）",
      "audio codec / neural codec",
      "離散表現（tokenization）",
      "条件付き生成（conditioning, classifier-free guidance的発想）",
      "時間周波数表現の基礎（STFT等）",
      "音楽の構造（拍・小節・反復）",
      "データセットのバイアス/著作権・利用制約"
    ]
  },

  {
    title: "MusicLM: Generating Music From Text",
    year: "2023",
    venue: "arXiv",
    relevance: 0.93,
    reason:
      "“テキスト→音楽”の品質を強く押し上げた有名枠。大規模データと階層化された生成設計が象徴的。",
    pdfUrl: "https://arxiv.org/pdf/2301.11325.pdf",
    imageUrl:
      "https://raw.githubusercontent.com/lucidrains/musiclm-pytorch/main/musiclm.png",
    summary:
      "音声コーデックで得た離散トークンを用い、階層的（粗→細）に生成して長尺・高忠実度を狙う。テキストと音楽のアラインメントを強化するための学習設計（表現学習や再ランキング等）も重要な要素。",
    keywords: [
      "text-to-music",
      "hierarchical generation",
      "audio tokens",
      "large-scale training",
      "alignment",
      "re-ranking"
    ],
    prereqKeywords: [
      "ニューラル音声コーデック（SoundStream/EnCodec系）",
      "自己回帰LMとスケーリング則の直感",
      "階層化（coarse-to-fine）",
      "テキスト-音声の表現学習（CLAP/コントラスト学習的発想）",
      "評価（主観評価、MUSHRA的枠組みの理解）",
      "データフィルタリングと安全性"
    ]
  },

  {
    title: "AudioLM: a Language Modeling Approach to Audio Generation",
    year: "2022",
    venue: "arXiv",
    relevance: 0.90,
    reason:
      "“音声を言語モデルする”路線の中核。音声（音楽含む）を離散トークンとして扱う設計を押し広げた。",
    pdfUrl: "https://arxiv.org/pdf/2209.03143.pdf",
    imageUrl:
      "https://raw.githubusercontent.com/lucidrains/audiolm-pytorch/main/audiolm.png",
    summary:
      "音声をニューラルコーデックで離散化し、言語モデルの枠で生成する。意味（semantic）と音色・忠実度（acoustic）を分けて扱うなど、品質と一貫性のための分解設計が特徴。",
    keywords: [
      "audio generation",
      "discrete audio tokens",
      "neural audio codec",
      "semantic/acoustic modeling",
      "language model"
    ],
    prereqKeywords: [
      "音声コーデック（SoundStream/EnCodec）",
      "量子化（RVQなど）の直感",
      "自己回帰生成と露出バイアス",
      "長距離依存と圧縮表現",
      "音声評価の難しさ（客観指標の限界）"
    ]
  },

  {
    title: "Jukebox: A Generative Model for Music",
    year: "2020",
    venue: "arXiv",
    relevance: 0.84,
    reason:
      "ニューラルコーデック＋階層生成で“歌声込みの音楽”に踏み込んだ古典的マイルストーン。後続の発想の源泉。",
    pdfUrl: "https://arxiv.org/pdf/2005.00341.pdf",
    imageUrl:
      "https://images.openai.com/blob/562d9b9c-4cb9-40db-bf8d-3de8fc7b03f2/image-4.webp",
    summary:
      "VQ-VAE系の離散表現を土台に、階層的に長尺音楽を生成する。計算コストは重いが“波形を直接生成するのはキツい”現実に対し、圧縮表現＋LMで突破した象徴。",
    keywords: [
      "music generation",
      "VQ-VAE",
      "discrete tokens",
      "hierarchical modeling",
      "lyrics conditioning"
    ],
    prereqKeywords: [
      "VQ-VAE / 離散潜在変数モデル",
      "階層モデル（top/middle/bottom）",
      "音声の自己回帰生成の計算特性",
      "条件付き生成（アーティスト/歌詞など）",
      "著作権・データ倫理（特に音楽）"
    ]
  },

  {
    title: "Music Transformer: Generating Music with Long-Term Structure",
    year: "2018",
    venue: "arXiv",
    relevance: 0.80,
    reason:
      "主に“象徴音楽（MIDI/イベント列）”側の定番。相対位置/相対注意で長期構造を扱う設計が、その後の音楽LMの土台。",
    pdfUrl: "https://arxiv.org/pdf/1809.04281.pdf",
    imageUrl: "https://magenta.withgoogle.com/music-transformer",
    summary:
      "イベント列として音楽を表し、Transformer（特に相対注意）で長距離の反復・構造を捉えやすくする。オーディオ生成とは表現が違うが、“音楽の長期一貫性”という同じ悪夢に真正面から殴りかかった。",
    keywords: [
      "symbolic music generation",
      "Transformer",
      "relative attention",
      "long-term structure",
      "event-based representation"
    ],
    prereqKeywords: [
      "MIDI/イベント表現（note-on/off, time-shift等）",
      "Transformerの注意機構",
      "相対位置表現/相対注意",
      "音楽理論の最小セット（拍・和声・反復）",
      "生成評価（構造/反復/破綻の観察軸）"
    ]
  },
  {
    title: "Multimodal music information processing and retrieval: survey and future challenges",
    year: "2019",
    venue: "arXiv",
    relevance: 0.93,
    reason: "MIRを“マルチモーダル”観点で俯瞰できる。音・歌詞・タグ・映像などをどう統合するかの地図になる。",
    pdfUrl: "https://arxiv.org/pdf/1902.05347.pdf",
    summary:
      "音声だけでなく、歌詞・メタデータ・映像・ジェスチャなど複数モダリティを組み合わせてMIR性能を上げる流れを整理し、融合手法や課題（データ、評価、バイアス等）をまとめたサーベイ。",
    keywords: [
      "music information retrieval",
      "multimodal",
      "information fusion",
      "audio",
      "lyrics",
      "metadata",
      "survey"
    ],
    imageUrl: "",
    prereqKeywords: [
      "MIRタスク概観（タグ付け・検索・推薦など）",
      "特徴量（スペクトログラム・埋め込み）の直感",
      "マルチモーダル学習（late/early fusion）",
      "評価設計（データ分割・リーク）",
      "バイアス/スパーシティ（タグの偏り）"
    ]
  },
  {
    title: "Convolutional Recurrent Neural Networks for Music Classification",
    year: "2016",
    venue: "arXiv",
    relevance: 0.90,
    reason: "音楽タグ付け（=検索・推薦の基盤特徴）での“CNN+RNN”定番構成を押さえられる。",
    pdfUrl: "https://arxiv.org/pdf/1609.04243.pdf",
    summary:
      "音声スペクトログラムにCNNで局所特徴を抽出し、RNNで時間方向に要約するCRNNを提案。音楽タグ付けで性能と計算のバランスが良い構成として広く参照される。",
    keywords: [
      "music tagging",
      "audio classification",
      "CRNN",
      "CNN",
      "RNN",
      "log-mel spectrogram"
    ],
    imageUrl: "https://ar5iv.labs.arxiv.org/html/1609.04243/assets/x1.png",
    prereqKeywords: [
      "log-melスペクトログラム",
      "CNN（畳み込み・プーリング）",
      "RNN/LSTM/GRU（時系列要約）",
      "マルチラベル分類（タグ）",
      "評価指標（AUC, PR-AUC など）"
    ]
  },
  {
    title: "musicnn: Pre-trained convolutional neural networks for music audio tagging",
    year: "2019",
    venue: "arXiv",
    relevance: 0.87,
    reason: "MIRでよくある“音声埋め込みを下流に使う”発想を、プリトレモデルとして現実的にする。",
    pdfUrl: "https://arxiv.org/pdf/1909.06654.pdf",
    summary:
      "音楽的な帰納バイアス（時間・周波数方向の見方）を意識したCNN群を整理し、音楽タグ付け用のプリトレモデルとして提供。特徴抽出器として下流タスクへ転用しやすい。",
    keywords: [
      "pretrained model",
      "music tagging",
      "CNN",
      "representation learning",
      "transfer learning",
      "timbre"
    ],
    imageUrl: "https://ar5iv.labs.arxiv.org/html/1909.06654/assets/musicnn.png",
    prereqKeywords: [
      "音声タグ付け（教師あり学習）",
      "転移学習（feature extractor）",
      "畳み込み設計（時間/周波数方向のカーネル）",
      "データ拡張（SpecAugment等の発想）",
      "ドメインシフト（ジャンル偏り）"
    ]
  },
  {
    title: "Learning a Representation for Cover Song Identification using Convolutional Neural Network",
    year: "2019",
    venue: "arXiv",
    relevance: 0.84,
    reason: "“同じ曲の別バージョンを探す”という検索タスク（Cover Song Identification）を深層表現で扱う代表例。",
    pdfUrl: "https://arxiv.org/pdf/1911.00334.pdf",
    summary:
      "カバー曲同定では編曲・テンポ・キー変化などで単純特徴が崩れる。CNNで類似性に強い表現を学習し、従来の手作り特徴＋アラインメント依存からの脱却を狙う。",
    keywords: [
      "cover song identification",
      "music similarity",
      "representation learning",
      "CNN",
      "chroma/CQT",
      "metric learning"
    ],
    imageUrl: "",
    prereqKeywords: [
      "カバー曲同定（CSI）の定義",
      "音楽類似度（timing/key変化の影響）",
      "クロマ特徴 / CQT の直感",
      "距離学習（metric learning）",
      "アラインメント（DTW等）の基本発想"
    ]
  },
  {
    title: "Deep content-based music recommendation",
    year: "2013",
    venue: "NeurIPS 2013 (公開PDF)",
    relevance: 0.82,
    reason: "推薦＝情報検索のど真ん中。協調フィルタの潜在因子を“音声から予測”してコールドスタートを殴る古典。",
    pdfUrl: "https://backoffice.biblio.ugent.be/download/4324554/4324567",
    summary:
      "協調フィルタで得た楽曲の潜在因子（latent factors）を、音声信号から深層モデルで推定して推薦へ接続。利用履歴がない新曲でも推薦できる“コールドスタート”対策として強い位置づけ。",
    keywords: [
      "music recommendation",
      "content-based",
      "collaborative filtering",
      "latent factors",
      "cold start",
      "CNN"
    ],
    imageUrl: "https://figures.semanticscholar.org/eeff60867041d2ea92d1b38a20c2031d240d8872/7-Figure1-1.png",
    prereqKeywords: [
      "推薦の基礎（協調フィルタ・行列分解）",
      "コールドスタート問題",
      "潜在因子モデル（latent factor）",
      "音声特徴→埋め込み→予測の流れ",
      "オフライン評価（ランキング指標の罠）"
    ]
  }
]

export const SUGGESTED_TOPICS = [
  "3D Gaussian Splatting（基礎）",
  "動的シーン（4D / deformation）",
  "スケール頑健性・アンチエイリアス",
  "構造化・圧縮・メモリ削減",
  "3DGSベースSLAM（オンライン最適化）"
];

export const LINEAGE_EDGES: LineageEdge[] = [
  {
    fromTitle: "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    toTitle: "Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering",
    improvement: "構造化アンカーで冗長ガウスの増殖を抑え、頑健性と被覆を向上"
  },
  {
    fromTitle: "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    toTitle: "Mip-Splatting: Alias-free 3D Gaussian Splatting",
    improvement: "マルチスケール耐性を導入し、エイリアシングや破綻を抑制"
  },
  {
    fromTitle: "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    toTitle: "4D Gaussian Splatting for Real-Time Dynamic Scene Rendering",
    improvement: "時間方向を拡張し、動的シーンの表現と描画に対応"
  },
  {
    fromTitle: "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    toTitle: "Gaussian Splatting SLAM",
    improvement: "オンライン推定（SLAM）に統合し、追跡と再構成を同時最適化"
  }
];
