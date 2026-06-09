# DB password (generated), the rendered .env in SSM SecureString, and the
# IAM role that lets the instance read it.

resource "random_password" "db" {
  length  = 24
  special = false # keep it URL-safe for the DATABASE_URL
}

resource "aws_ssm_parameter" "dotenv" {
  name        = "/${var.project}/${var.environment}/dotenv"
  description = "Full production .env for AI Commerce OS"
  type        = "SecureString"
  value       = local.dotenv
  tags        = { Name = "${local.name}-dotenv" }
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${local.name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "ssm_read" {
  statement {
    sid       = "ReadAppParams"
    actions   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.aws_region}:*:parameter/${var.project}/${var.environment}/*"]
  }
  statement {
    sid       = "DecryptViaSSM"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "ssm_read" {
  name   = "${local.name}-ssm-read"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ssm_read.json
}

# Enables Session Manager (browser-based SSH-less shell) as a bonus.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name}-ec2-profile"
  role = aws_iam_role.ec2.name
}