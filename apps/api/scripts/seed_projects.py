"""
Firestoreにプロジェクトのシードデータを投入するスクリプト。
Docker内で実行: docker compose exec api python /app/scripts/seed_projects.py
"""
import asyncio
import sys
import os

# appモジュールを見つけるためにパスを追加
sys.path.insert(0, "/app")

from datetime import datetime, timezone, timedelta
from google.cloud import firestore


SEED_PROJECTS = [
    {
        "title": "Transformer Survey",
        "description": "Transformer系アーキテクチャの進化と応用に関するサーベイ論文プロジェクト",
        "papers": [
            {"id": "att001", "title": "Attention Is All You Need", "authors": ["Vaswani, A.", "Shazeer, N."], "year": 2017, "venue": "NeurIPS"},
            {"id": "bert001", "title": "BERT: Pre-training of Deep Bidirectional Transformers", "authors": ["Devlin, J.", "Chang, M."], "year": 2019, "venue": "NAACL"},
            {"id": "gpt3001", "title": "Language Models are Few-Shot Learners", "authors": ["Brown, T.", "Mann, B."], "year": 2020, "venue": "NeurIPS"},
            {"id": "vit001", "title": "An Image is Worth 16x16 Words: ViT", "authors": ["Dosovitskiy, A."], "year": 2021, "venue": "ICLR"},
            {"id": "gpt2001", "title": "Language Models are Unsupervised Multitask Learners", "authors": ["Radford, A.", "Wu, J."], "year": 2019, "venue": "OpenAI"},
            {"id": "t5001", "title": "Exploring the Limits of Transfer Learning with T5", "authors": ["Raffel, C.", "Shazeer, N."], "year": 2020, "venue": "JMLR"},
            {"id": "llama001", "title": "LLaMA: Open and Efficient Foundation Language Models", "authors": ["Touvron, H."], "year": 2023, "venue": "arXiv"},
            {"id": "flash001", "title": "FlashAttention: Fast and Memory-Efficient Attention", "authors": ["Dao, T."], "year": 2022, "venue": "NeurIPS"},
        ],
    },
    {
        "title": "Few-shot Learning研究",
        "description": "少数サンプル学習の最新手法を整理・比較するプロジェクト",
        "papers": [
            {"id": "proto001", "title": "Prototypical Networks for Few-shot Learning", "authors": ["Snell, J.", "Swersky, K."], "year": 2017, "venue": "NeurIPS"},
            {"id": "maml001", "title": "Model-Agnostic Meta-Learning for Fast Adaptation", "authors": ["Finn, C.", "Abbeel, P."], "year": 2017, "venue": "ICML"},
            {"id": "match001", "title": "Matching Networks for One Shot Learning", "authors": ["Vinyals, O."], "year": 2016, "venue": "NeurIPS"},
            {"id": "gpt3001", "title": "Language Models are Few-Shot Learners", "authors": ["Brown, T.", "Mann, B."], "year": 2020, "venue": "NeurIPS"},
            {"id": "siamese001", "title": "Siamese Neural Networks for One-shot Image Recognition", "authors": ["Koch, G."], "year": 2015, "venue": "ICML Workshop"},
            {"id": "relation001", "title": "Learning to Compare: Relation Network for Few-Shot Learning", "authors": ["Sung, F."], "year": 2018, "venue": "CVPR"},
            {"id": "cross001", "title": "A Closer Look at Few-Shot Classification", "authors": ["Chen, W."], "year": 2019, "venue": "ICLR"},
            {"id": "tadam001", "title": "TADAM: Task dependent adaptive metric", "authors": ["Oreshkin, B."], "year": 2018, "venue": "NeurIPS"},
            {"id": "feat001", "title": "Few-Shot Learning via Saliency-Guided Hallucination", "authors": ["Zhang, H."], "year": 2019, "venue": "CVPR"},
            {"id": "meta001", "title": "Meta-Learning with Differentiable Convex Optimization", "authors": ["Lee, K."], "year": 2019, "venue": "CVPR"},
            {"id": "dn4001", "title": "Revisiting Local Descriptor based Image-to-Class Measure", "authors": ["Li, W."], "year": 2019, "venue": "CVPR"},
            {"id": "tpn001", "title": "Transductive Propagation Network for Few-shot Learning", "authors": ["Liu, Y."], "year": 2019, "venue": "ICLR"},
        ],
    },
    {
        "title": "Vision-Language Models",
        "description": "視覚と言語のマルチモーダルモデルの最新動向",
        "papers": [
            {"id": "clip001", "title": "Learning Transferable Visual Models From Natural Language Supervision", "authors": ["Radford, A."], "year": 2021, "venue": "ICML"},
            {"id": "dalle001", "title": "Zero-Shot Text-to-Image Generation", "authors": ["Ramesh, A."], "year": 2021, "venue": "ICML"},
            {"id": "flamingo001", "title": "Flamingo: a Visual Language Model for Few-Shot Learning", "authors": ["Alayrac, J."], "year": 2022, "venue": "NeurIPS"},
            {"id": "blip001", "title": "BLIP: Bootstrapping Language-Image Pre-training", "authors": ["Li, J."], "year": 2022, "venue": "ICML"},
            {"id": "gpt4v001", "title": "GPT-4V(ision) System Card", "authors": ["OpenAI"], "year": 2023, "venue": "OpenAI"},
            {"id": "llava001", "title": "Visual Instruction Tuning (LLaVA)", "authors": ["Liu, H."], "year": 2023, "venue": "NeurIPS"},
        ],
    },
    {
        "title": "Efficient Inference",
        "description": "LLMの高速推論技術（量子化・蒸留・スパース化）",
        "papers": [
            {"id": "distil001", "title": "DistilBERT, a distilled version of BERT", "authors": ["Sanh, V."], "year": 2019, "venue": "NeurIPS Workshop"},
            {"id": "quant001", "title": "GPTQ: Accurate Post-Training Quantization for GPT", "authors": ["Frantar, E."], "year": 2023, "venue": "ICLR"},
            {"id": "specul001", "title": "Fast Inference from Transformers via Speculative Decoding", "authors": ["Leviathan, Y."], "year": 2023, "venue": "ICML"},
            {"id": "flash001", "title": "FlashAttention: Fast and Memory-Efficient Attention", "authors": ["Dao, T."], "year": 2022, "venue": "NeurIPS"},
            {"id": "prune001", "title": "SparseGPT: Massive Language Models Can Be Accurately Pruned", "authors": ["Frantar, E."], "year": 2023, "venue": "ICML"},
            {"id": "qlora001", "title": "QLoRA: Efficient Finetuning of Quantized LLMs", "authors": ["Dettmers, T."], "year": 2023, "venue": "NeurIPS"},
            {"id": "awq001", "title": "AWQ: Activation-aware Weight Quantization", "authors": ["Lin, J."], "year": 2023, "venue": "MLSys"},
            {"id": "ggml001", "title": "llama.cpp: Inference of LLaMA model in pure C/C++", "authors": ["Gerganov, G."], "year": 2023, "venue": "GitHub"},
            {"id": "vllm001", "title": "Efficient Memory Management for LLM Serving with PagedAttention", "authors": ["Kwon, W."], "year": 2023, "venue": "SOSP"},
            {"id": "medusa001", "title": "Medusa: Simple LLM Inference Acceleration Framework", "authors": ["Cai, T."], "year": 2024, "venue": "ICML"},
            {"id": "moe001", "title": "Switch Transformers: Scaling to Trillion Parameter Models", "authors": ["Fedus, W."], "year": 2022, "venue": "JMLR"},
            {"id": "tinyml001", "title": "TinyML: Machine Learning for Edge Devices", "authors": ["Banbury, C."], "year": 2021, "venue": "MLSys"},
            {"id": "sparse001", "title": "Scaling Laws for Sparsely-Connected Foundation Models", "authors": ["Frantar, E."], "year": 2023, "venue": "arXiv"},
            {"id": "kd001", "title": "Distilling the Knowledge in a Neural Network", "authors": ["Hinton, G."], "year": 2015, "venue": "NeurIPS Workshop"},
            {"id": "eagle001", "title": "EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty", "authors": ["Li, Y."], "year": 2024, "venue": "ICML"},
        ],
    },
]


async def seed():
    from app.core.config import settings

    db = firestore.AsyncClient(
        project=settings.gcp_project_id,
        database=settings.firestore_db,
    )

    # 既存のユーザーをFirestoreから取得して最初のユーザーをオーナーにする
    owner_uid = None
    async for doc in db.collection("users").limit(1).stream():
        owner_uid = doc.id
        break

    if not owner_uid:
        print("WARNING: No users found in Firestore. Using placeholder UID.")
        print("Login to the app first, then run this script again.")
        owner_uid = "seed-user-placeholder"

    print(f"Seeding projects for owner: {owner_uid}")

    now = datetime.now(timezone.utc)

    for i, proj_data in enumerate(SEED_PROJECTS):
        project_time = now - timedelta(hours=i * 24)

        # projects/{projectId} — スキーマ準拠
        project_ref = db.collection("projects").document()
        await project_ref.set({
            "ownerUid": owner_uid,
            "title": proj_data["title"],
            "description": proj_data["description"],
            "paperCount": len(proj_data["papers"]),
            "status": "active",
            "createdAt": project_time - timedelta(days=30),
            "updatedAt": project_time,
        })

        print(f"  Created project: {proj_data['title']} (ID: {project_ref.id})")

        # projects/{projectId}/papers/{paperId}
        for paper in proj_data["papers"]:
            paper_ref = project_ref.collection("papers").document(paper["id"])
            await paper_ref.set({
                "paperId": paper["id"],
                "note": "",
                "role": "reference",
                "addedAt": project_time,
            })

            # papers/{paperId} — スキーマ準拠 (ownerUid付き)
            main_paper_ref = db.collection("papers").document(paper["id"])
            main_doc = await main_paper_ref.get()
            if not main_doc.exists:
                await main_paper_ref.set({
                    "id": paper["id"],
                    "ownerUid": owner_uid,
                    "title": paper["title"],
                    "authors": paper.get("authors", []),
                    "year": paper.get("year"),
                    "venue": paper.get("venue", ""),
                    "abstract": "",
                    "doi": None,
                    "arxivId": None,
                    "pdfUrl": None,
                    "pdfGcsPath": None,
                    "status": "PENDING",
                    "createdAt": project_time,
                    "updatedAt": project_time,
                })

        print(f"    Added {len(proj_data['papers'])} papers")

    print("\nSeed completed!")


if __name__ == "__main__":
    asyncio.run(seed())
