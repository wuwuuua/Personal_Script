#!/bin/bash

# 网易云音乐 ncm 转换脚本 (固定路径版)
# 功能：将指定目录的 ncm 文件转换为 mp3，移动到目标目录，并清理原目录

# 1. 路径配置
NCMDUMP_BIN="/opt/homebrew/bin/ncmdump"
SOURCE_DIR="/Users/mumunn/Music/网易云音乐"
TARGET_DIR="/Volumes/音乐/音乐/download"

echo "=========================================="
echo "网易云音乐 ncm 文件转换脚本"
echo "=========================================="

# 2. 环境检查
# 检查 ncmdump 是否存在
if [ ! -f "$NCMDUMP_BIN" ]; then
    echo "错误: 未找到 ncmdump (路径: $NCMDUMP_BIN)"
    exit 1
fi

# 检查源目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "错误: 源目录 $SOURCE_DIR 不存在"
    exit 1
fi

# 检查目标目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目标目录 $TARGET_DIR 不存在"
    exit 1
fi

# 3. 进入工作目录
cd "$SOURCE_DIR" || exit 1
echo "当前处理目录: $SOURCE_DIR"

# 统计 ncm 文件数量
ncm_count=$(find . -maxdepth 1 -name "*.ncm" -type f | wc -l | tr -d ' ')

if [ "$ncm_count" -eq 0 ]; then
    echo "目录中没有找到 .ncm 文件"
    exit 0
fi

echo "找到 $ncm_count 个 .ncm 文件"
echo ""

# 智能等待函数：等待文件写入完成
wait_for_file_complete() {
    local file="$1"
    local max_wait_seconds=30  # 最大等待30秒
    local check_interval=0.5  # 每0.5秒检查一次
    local stable_count=0
    local required_stable=3  # 需要3次检查文件大小不变才认为完成
    local last_size=-1
    local iterations=0
    local max_iterations=$((max_wait_seconds * 2))  # 0.5秒间隔，所以乘以2

    while [ $iterations -lt $max_iterations ]; do
        if [ -f "$file" ]; then
            local current_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)

            if [ "$current_size" = "$last_size" ] && [ "$last_size" != "-1" ]; then
                ((stable_count++))
                if [ $stable_count -ge $required_stable ]; then
                    return 0
                fi
            else
                stable_count=0
                last_size=$current_size
            fi
        fi

        sleep $check_interval
        ((iterations++))
    done

    echo "警告: 文件 $file 写入超时"
    return 1
}

# 第一步：转换 ncm 到 mp3
echo "步骤 1: 转换 ncm 文件为 mp3..."
for ncm_file in *.ncm; do
    if [ -f "$ncm_file" ]; then
        echo "正在转换: $ncm_file"
        "$NCMDUMP_BIN" "$ncm_file"

        # 转换后的 mp3 文件名（去掉 .ncm 后缀，添加 .mp3）
        mp3_file="${ncm_file%.ncm}.mp3"

        # 智能等待 mp3 文件完全写入
        if [ -f "$mp3_file" ]; then
            echo "  等待文件写入完成..."
            wait_for_file_complete "$mp3_file"
            echo "  ✓ $mp3_file 转换完成"
        fi
    fi
done
echo "转换完成"
echo ""

# 第二步：复制所有 mp3 到目标目录
echo "步骤 2: 复制 mp3 文件到 $TARGET_DIR ..."
mp3_count=$(find . -maxdepth 1 -name "*.mp3" -type f | wc -l | tr -d ' ')
copied=0

for mp3_file in *.mp3; do
    if [ -f "$mp3_file" ]; then
        echo "复制: $mp3_file"

        # 使用 rsync 代替 cp，避免扩展属性和权限问题
        # -a: 归档模式，--no-o: 不保留 owner，--no-g: 不保留 group，--no-perms: 不保留权限
        # 注意：移除 --info=progress2 以兼容旧版本 rsync
        rsync -a --no-o --no-g --no-perms "$mp3_file" "$TARGET_DIR/"

        if [ $? -eq 0 ]; then
            ((copied++))

            # 智能等待目标文件完全写入
            target_file="$TARGET_DIR/$mp3_file"
            if [ -f "$target_file" ]; then
                echo "  等待文件同步到目标位置..."
                wait_for_file_complete "$target_file"

                # 额外验证：比较源文件和目标文件大小
                source_size=$(stat -f%z "$mp3_file" 2>/dev/null || stat -c%s "$mp3_file" 2>/dev/null)
                target_size=$(stat -f%z "$target_file" 2>/dev/null || stat -c%s "$target_file" 2>/dev/null)

                if [ "$source_size" = "$target_size" ] && [ "$target_size" != "0" ]; then
                    echo "  ✓ 文件验证成功 ($source_size bytes)"
                else
                    echo "  ⚠ 警告: 文件大小不匹配 (源: $source_size, 目标: $target_size)"
                fi
            fi

            # 强制同步文件系统缓存
            sync
        else
            echo "  ✗ 复制失败"
        fi
    fi
done

echo "已成功复制 $copied 个文件"
echo ""

# 第三步：清理当前目录（SOURCE_DIR）的临时文件
echo "步骤 3: 验证并清理原目录中的 ncm 和 mp3 文件..."

# 验证所有文件都已成功复制
echo "验证所有文件复制情况..."
all_verified=true
for mp3_file in *.mp3; do
    if [ -f "$mp3_file" ]; then
        target_file="$TARGET_DIR/$mp3_file"
        if [ ! -f "$target_file" ]; then
            echo "✗ 错误: $mp3_file 未在目标目录找到"
            all_verified=false
        else
            source_size=$(stat -f%z "$mp3_file" 2>/dev/null || stat -c%s "$mp3_file" 2>/dev/null)
            target_size=$(stat -f%z "$target_file" 2>/dev/null || stat -c%s "$target_file" 2>/dev/null)

            if [ "$source_size" != "$target_size" ]; then
                echo "✗ 错误: $mp3_file 文件大小不匹配"
                all_verified=false
            fi
        fi
    fi
done

if [ "$all_verified" = true ]; then
    echo "✓ 所有文件验证通过，开始清理..."

    # 最后一次强制同步
    sync

    # 安全起见，只删除当前目录下的匹配文件
    rm -f *.ncm
    rm -f *.mp3
    echo "✓ 清理完成"
else
    echo ""
    echo "⚠ 警告: 部分文件验证失败，跳过清理步骤"
    echo "请检查目标目录中的文件"
    exit 1
fi

echo ""
echo "=========================================="
echo "全部处理完成！"
echo "文件已保存至: $TARGET_DIR"
echo "=========================================="